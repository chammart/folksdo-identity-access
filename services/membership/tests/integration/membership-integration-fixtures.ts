// services/membership/tests/integration/membership-integration-fixtures.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP INTEGRATION FIXTURES
// -----------------------------------------------------------------------------
// Real Membership HTTP and authorization fixtures for isolated certification.
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

import type {
    LightMyRequestResponse,
} from "fastify";

import {
    membershipPermissions,
} from "../../src/authorization";

import {
    createIamIntegrationContext,
} from "../../../../tests/integration/support/iam-integration-context";

import {
    getIamIntegrationRuntime,
    type IamIntegrationRuntime,
} from "../../../../tests/integration/support/iam-integration-runtime";

import {
    createActiveIdentity,
    prepareProviderIdentityReadContext,
    signInIdentity,
    type CertifiedIdentity,
} from "../../../identity/tests/integration/identity-integration-fixtures";

export interface MembershipCertificationContext {
    readonly identity: CertifiedIdentity;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly membershipId: string;
}

export async function createMembershipCertificationContext(): Promise<MembershipCertificationContext> {
    const identity =
        await createActiveIdentity();

    const sessionId =
        await signInIdentity(
            identity,
        );

    await prepareProviderIdentityReadContext(
        identity,
    );

    const runtime =
        await getIamIntegrationRuntime();

    const now =
        new Date()
            .toISOString();

    for (const permission of Object.values(membershipPermissions)) {
        const [service, resource, action] =
            permission.split(".");

        const permissionId =
            `permission_${service}_${resource}_${action}`;

        await runtime.database.database
            .collection("access_permissions")
            .updateOne(
                { permissionId },
                { $set: {
                    permissionId,
                    service,
                    resource,
                    action,
                    displayName: permission,
                    description: `Allows ${permission}.`,
                    classification: "administrative",
                    createdAt: now,
                } },
                { upsert: true },
            );

        await runtime.database.database
            .collection("access_permission_assignments")
            .insertOne({
                assignmentId:
                    `assignment_${randomUUID()}`,
                identityId:
                    identity.userId,
                membershipId:
                    identity.membershipId,
                tenantId:
                    identity.tenantId,
                permissionId,
                assignmentType:
                    "grant",
                scope: {
                    scopeType:
                        "tenant",
                },
                status:
                    "active",
                assignedBy:
                    "system:membership-integration",
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
    }

    return {
        identity,
        sessionId,
        tenantId:
            identity.tenantId,
        membershipId:
            identity.membershipId,
    };
}

export async function createCertifiedMembership(
    certification: MembershipCertificationContext,
    activate = false,
): Promise<Record<string, unknown>> {
    const runtime =
        await getIamIntegrationRuntime();

    const response =
        await membershipPost(
            runtime,
            "/api/v1/membership",
            {
                identityId:
                    `identity_${randomUUID()}`,
                tenantId:
                    certification.tenantId,
                membershipType:
                    "member",
                activate,
            },
            certification.sessionId,
        );

    expectMembershipStatus(
        response,
        201,
    );

    return response.json<Record<string, unknown>>();
}

export async function createCertifiedInvitation(
    certification: MembershipCertificationContext,
    invitedEmail =
        `invited-${randomUUID()}@example.com`,
): Promise<Record<string, unknown>> {
    const runtime =
        await getIamIntegrationRuntime();

    const response =
        await membershipPost(
            runtime,
            "/api/v1/membership/invitations",
            {
                tenantId:
                    certification.tenantId,
                invitedEmail:
                    invitedEmail,
                membershipType:
                    "member",
            },
            certification.sessionId,
        );

    expectMembershipStatus(
        response,
        201,
    );

    return response.json<Record<string, unknown>>();
}

export function createMembershipReactionContext(
    runtime: IamIntegrationRuntime,
    certification: MembershipCertificationContext,
) {
    return createIamIntegrationContext(
        runtime.server.platformRuntime,
        {
            requestId:
                `request_${randomUUID()}`,
            actorId:
                "system:membership-reaction",
            actorType:
                "service",
            tenantId:
                certification.tenantId,
            tenantType:
                "customer",
        },
    );
}

export async function membershipPost(
    runtime: IamIntegrationRuntime,
    url: string,
    payload: Record<string, unknown>,
    sessionId: string,
): Promise<LightMyRequestResponse> {
    return await runtime.server.app.inject({
        method:
            "POST",
        url,
        headers: {
            authorization:
                `Bearer ${sessionId}`,
            "content-type":
                "application/json",
        },
        payload,
    });
}

export async function membershipGet(
    runtime: IamIntegrationRuntime,
    url: string,
    sessionId: string,
): Promise<LightMyRequestResponse> {
    return await runtime.server.app.inject({
        method:
            "GET",
        url,
        headers: {
            authorization:
                `Bearer ${sessionId}`,
        },
    });
}

export function expectMembershipStatus(
    response: LightMyRequestResponse,
    statusCode: number,
): void {
    if (response.statusCode !== statusCode) {
        throw new Error(
            `Expected HTTP ${statusCode}, received ${response.statusCode}: ${response.body}`,
        );
    }
}
