// tests/e2e/access/access-authorization-decision.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHORIZATION DECISION HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Certifies the real /authorize decision path through authenticated HTTP:
//   • direct Permission allow
//   • deny-by-default
//   • Role-derived Permission allow
//   • Restriction override
//   • trusted Membership/Tenant context enforcement
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    getIamIntegrationRuntime,
} from "../../integration/support/iam-integration-runtime";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "./support/access-authenticated-fixtures";

interface CertificationPermission {
    readonly permissionId: string;
    readonly service: string;
    readonly resource: string;
    readonly action: string;
}

async function seedPermission(
    permission: CertificationPermission,
): Promise<void> {
    const runtime =
        await getIamIntegrationRuntime();

    const now =
        new Date().toISOString();

    await runtime.database.database
        .collection("access_permissions")
        .insertOne({
            permissionId:
                permission.permissionId,
            service:
                permission.service,
            resource:
                permission.resource,
            action:
                permission.action,
            displayName:
                permission.permissionId,
            description:
                `Certification Permission ${permission.permissionId}.`,
            classification:
                "administrative",
            createdAt:
                now,
        });
}

async function seedDirectPermissionGrant(input: {
    readonly identityId: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly permissionId: string;
}): Promise<string> {
    const runtime =
        await getIamIntegrationRuntime();

    const now =
        new Date().toISOString();

    const assignmentId =
        `assignment_${randomUUID()}`;

    await runtime.database.database
        .collection("access_permission_assignments")
        .insertOne({
            assignmentId,
            identityId:
                input.identityId,
            membershipId:
                input.membershipId,
            tenantId:
                input.tenantId,
            permissionId:
                input.permissionId,
            assignmentType:
                "grant",
            scope: {
                scopeType:
                    "tenant",
            },
            status:
                "active",
            assignedBy:
                "system:access-e2e-certification",
            effectiveFrom:
                now,
            activatedAt:
                now,
            suspensionSources:
                [],
            createdAt:
                now,
            updatedAt:
                now,
        });

    return assignmentId;
}

function createPermission(
    prefix: string,
): CertificationPermission {
    const suffix =
        randomUUID();

    return {
        permissionId:
            `permission_${suffix}`,
        service:
            "certification",
        resource:
            prefix,
        action:
            "read",
    };
}

describe(
    "Access™ authorization decision HTTP behavior",
    () => {
        it(
            "allows an action granted directly to the active Membership",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const permission =
                    createPermission(
                        "direct",
                    );

                await seedPermission(
                    permission,
                );

                const assignmentId =
                    await seedDirectPermissionGrant({
                        identityId:
                            certification.identity.userId,
                        membershipId:
                            certification.membershipId,
                        tenantId:
                            certification.tenantId,
                        permissionId:
                            permission.permissionId,
                    });

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/authorize",
                        {
                            action:
                                `${permission.service}.${permission.resource}.${permission.action}`,
                            resource: {
                                type:
                                    permission.resource,
                            },
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    allowed:
                        true,
                    reasonCode:
                        "permission_granted",
                    actorId:
                        certification.identity.userId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    action:
                        `${permission.service}.${permission.resource}.${permission.action}`,
                    resource: {
                        type:
                            permission.resource,
                    },
                    contributingPermissionAssignmentIds:
                        expect.arrayContaining([
                            assignmentId,
                        ]),
                });
            },
        );

        it(
            "denies by default when the requested Permission exists but has no effective grant",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const permission =
                    createPermission(
                        "default-deny",
                    );

                await seedPermission(
                    permission,
                );

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/authorize",
                        {
                            action:
                                `${permission.service}.${permission.resource}.${permission.action}`,
                            resource: {
                                type:
                                    permission.resource,
                            },
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    allowed:
                        false,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    action:
                        `${permission.service}.${permission.resource}.${permission.action}`,
                });

                expect([
                    "permission_not_effective",
                    "default_deny",
                ]).toContain(
                    response.json().reasonCode,
                );
            },
        );

        it(
            "allows an action inherited through an active Tenant Role",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const permission =
                    createPermission(
                        "role-derived",
                    );

                await seedPermission(
                    permission,
                );

                // Tenant administrators may only delegate Permissions they
                // currently hold. Establish that authority for Role creation,
                // then remove the direct grant before evaluating the Role.
                const delegatedAssignmentId =
                    await seedDirectPermissionGrant({
                        identityId:
                            certification.identity.userId,
                        membershipId:
                            certification.membershipId,
                        tenantId:
                            certification.tenantId,
                        permissionId:
                            permission.permissionId,
                    });

                const role =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {
                            key:
                                `authorization-role-${randomUUID()}`,
                            name:
                                `Authorization Role ${randomUUID()}`,
                            description:
                                "Role-derived authorization certification.",
                            type:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionIds: [
                                permission.permissionId,
                            ],
                        },
                    );

                expect(
                    role.statusCode,
                ).toBe(
                    201,
                );

                const roleId =
                    String(
                        role.json().roleId,
                    );

                const assignment =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/role-assignments",
                        {
                            roleId,
                            subjectType:
                                "membership",
                            subjectId:
                                certification.membershipId,
                            identityId:
                                certification.identity.userId,
                            membershipId:
                                certification.membershipId,
                            tenantId:
                                certification.tenantId,
                        },
                    );

                expect(
                    assignment.statusCode,
                ).toBe(
                    201,
                );

                const roleAssignmentId =
                    String(
                        assignment.json().assignmentId,
                    );

                // Assignment also enforces delegated authority. Remove the
                // temporary direct grant only after the Role is assigned so
                // the authorization decision below can prove Role inheritance.
                await runtime.database.database
                    .collection(
                        "access_permission_assignments",
                    )
                    .deleteOne({
                        assignmentId:
                            delegatedAssignmentId,
                    });

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/authorize",
                        {
                            action:
                                `${permission.service}.${permission.resource}.${permission.action}`,
                            resource: {
                                type:
                                    permission.resource,
                            },
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    allowed:
                        true,
                    reasonCode:
                        "permission_granted",
                    contributingRoleIds:
                        expect.arrayContaining([
                            roleAssignmentId,
                        ]),
                });
            },
        );

        it(
            "lets an active Restriction override an otherwise effective Permission grant",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const permission =
                    createPermission(
                        "restricted",
                    );

                await seedPermission(
                    permission,
                );

                await seedDirectPermissionGrant({
                    identityId:
                        certification.identity.userId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    permissionId:
                        permission.permissionId,
                });

                const restriction =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/restrictions",
                        {
                            targetType:
                                "permission",
                            targetId:
                                permission.permissionId,
                            tenantId:
                                certification.tenantId,
                            reasonCode:
                                "authorization_certification",
                            description:
                                "Restriction override certification.",
                        },
                    );

                expect(
                    restriction.statusCode,
                ).toBe(
                    201,
                );

                const restrictionId =
                    String(
                        restriction.json().restrictionId,
                    );

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/authorize",
                        {
                            action:
                                `${permission.service}.${permission.resource}.${permission.action}`,
                            resource: {
                                type:
                                    permission.resource,
                            },
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    allowed:
                        false,
                    reasonCode:
                        "access_restricted",
                    appliedRestrictionIds:
                        expect.arrayContaining([
                            restrictionId,
                        ]),
                });
            },
        );

        it(
            "rejects caller-supplied authorization context that differs from the trusted active context",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/authorize",
                        {
                            action:
                                "membership.read",
                            resource: {
                                type:
                                    "membership",
                            },
                            membershipId:
                                certification.membershipId,
                            tenantId:
                                `tenant_${randomUUID()}`,
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    403,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    error: {
                        code:
                            expect.any(
                                String,
                            ),
                    },
                });
            },
        );
    },
);
