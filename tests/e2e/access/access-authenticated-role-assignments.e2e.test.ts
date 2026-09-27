// tests/e2e/access/access-authenticated-role-assignments.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED ROLE ASSIGNMENT HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises Tenant Role assignment lifecycle through the real public HTTP API.
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
    expectIamE2eOutboxCommitted,
} from "../support/iam-e2e-outbox-assertions";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "./support/access-authenticated-fixtures";

describe(
    "Access™ authenticated Role Assignment HTTP behavior",
    () => {
        it(
            "assigns, lists, and removes a Tenant Role for an eligible Membership",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const role =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {
                            key:
                                `certification-assignment-role-${randomUUID()}`,
                            name:
                                "Certification Assignment Role",
                            description:
                                "Role used for authenticated assignment certification.",
                            type:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionIds:
                                [],
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

                const assigned =
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
                    assigned.statusCode,
                ).toBe(
                    201,
                );

                expect(
                    assigned.json(),
                ).toMatchObject({
                    roleId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "active",
                });

                const assignmentId =
                    String(
                        assigned.json().assignmentId,
                    );

                const listed =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/role-assignments?membershipId=${encodeURIComponent(
                            certification.membershipId,
                        )}`,
                    );

                expect(
                    listed.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    listed.json(),
                ).toMatchObject({
                    items:
                        expect.arrayContaining([
                            expect.objectContaining({
                                assignmentId,
                                roleId,
                                membershipId:
                                    certification.membershipId,
                                status:
                                    "active",
                            }),
                        ]),
                    count:
                        expect.any(
                            Number,
                        ),
                });

                const usage =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/role-assignments?roleId=${encodeURIComponent(
                            roleId,
                        )}&status=active&limit=1&offset=0`,
                    );

                expect(
                    usage.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    usage.json(),
                ).toMatchObject({
                    items: [
                        expect.objectContaining({
                            assignmentId,
                            roleId,
                            membershipId:
                                certification.membershipId,
                            status:
                                "active",
                        }),
                    ],
                    count:
                        1,
                    total:
                        expect.any(
                            Number,
                        ),
                    limit:
                        1,
                    offset:
                        0,
                });

                expect(
                    usage.json().total,
                ).toBeGreaterThanOrEqual(
                    1,
                );

                const byIdentity =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/role-assignments?identityId=${encodeURIComponent(
                            certification.identity.userId,
                        )}&roleId=${encodeURIComponent(
                            roleId,
                        )}`,
                    );

                expect(
                    byIdentity.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    byIdentity.json(),
                ).toMatchObject({
                    items:
                        expect.arrayContaining([
                            expect.objectContaining({
                                assignmentId,
                                roleId,
                                membershipId:
                                    certification.membershipId,
                            }),
                        ]),
                    total:
                        expect.any(
                            Number,
                        ),
                });

                const identityViewPermissionId =
                    "permission_identity_identity_view";

                await runtime.database.database.collection("access_permissions").updateOne(
                    { permissionId: identityViewPermissionId },
                    { $set: {
                        permissionId: identityViewPermissionId,
                        service: "identity",
                        resource: "identity",
                        action: "view",
                        displayName: "identity.identity.view",
                        description: "Allows tenant Identity administration view.",
                        classification: "administrative",
                        createdAt: new Date().toISOString(),
                    } },
                    { upsert: true },
                );

                await runtime.database.database.collection("access_permission_assignments").insertOne({
                    assignmentId: `assignment_${randomUUID()}`,
                    identityId: certification.identity.userId,
                    membershipId: certification.membershipId,
                    tenantId: certification.tenantId,
                    permissionId: identityViewPermissionId,
                    assignmentType: "grant",
                    scope: { scopeType: "tenant" },
                    status: "active",
                    assignedBy: "system:tenant-people-e2e-certification",
                    effectiveFrom: new Date().toISOString(),
                    activatedAt: new Date().toISOString(),
                    suspensionSources: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                const people =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${encodeURIComponent(
                            certification.tenantId,
                        )}/people?search=${encodeURIComponent(
                            certification.identity.userId,
                        )}&limit=10&offset=0`,
                        headers: {
                            authorization: `Bearer ${certification.sessionId}`,
                        },
                    });

                expect(people.statusCode).toBe(200);
                expect(people.json()).toMatchObject({
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            identity: expect.objectContaining({
                                userId: certification.identity.userId,
                            }),
                            membership: expect.objectContaining({
                                membershipId: certification.membershipId,
                                tenantId: certification.tenantId,
                            }),
                            roles: expect.arrayContaining([
                                expect.objectContaining({ roleId }),
                            ]),
                            access: expect.objectContaining({
                                activeRoleCount: expect.any(Number),
                            }),
                        }),
                    ]),
                    total: expect.any(Number),
                    limit: 10,
                    offset: 0,
                });

                const crossTenantPeople =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${randomUUID()}/people`,
                        headers: {
                            authorization: `Bearer ${certification.sessionId}`,
                        },
                    });

                expect(crossTenantPeople.statusCode).toBe(403);

                const removed =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/role-assignments/${assignmentId}/remove`,
                        {
                            reason:
                                "Certification removal.",
                        },
                    );

                expect(
                    removed.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    removed.json(),
                ).toMatchObject({
                    assignmentId,
                    roleId,
                    status:
                        "removed",
                });

                await expect(
                    runtime.database.database
                        .collection(
                            "access_role_assignments",
                        )
                        .findOne({
                            assignmentId,
                        }),
                ).resolves.toMatchObject({
                    assignmentId,
                    roleId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "removed",
                });

                await expectIamE2eOutboxCommitted({
                    database:
                        runtime.database,
                    subject:
                        "access.role.removed",
                });
            },
        );
    },
);
