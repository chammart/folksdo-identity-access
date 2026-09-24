// services/identity/tests/integration/identity-integration-fixtures.ts
// -----------------------------------------------------------------------------
// IDENTITY INTEGRATION FIXTURES
// -----------------------------------------------------------------------------
// Real Identity lifecycle fixtures backed by the composed IAM runtime.
// Fixture preparation writes only prerequisite business facts. Every Identity
// operation under certification executes through the real HTTP and runtime.
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

import type {
    LightMyRequestResponse,
} from "fastify";

import {
    seedKnownInvitation,
} from "../../src/testing/seed-known-invitation";

import {
    getIamIntegrationRuntime,
    type IamIntegrationRuntime,
} from "../../../../tests/integration/support/iam-integration-runtime";

export const IDENTITY_TEST_PASSWORD =
    "Certification!Password1";

export const IDENTITY_REPLACEMENT_PASSWORD =
    "Certification!Password2";

export interface CertifiedIdentity {
    readonly userId: string;
    readonly sessionId: string;
    readonly verificationId: string;
    readonly verificationToken: string;
    readonly invitationId: string;
    readonly invitationToken: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly email: string;
    readonly password: string;
}

export async function createPendingIdentity(): Promise<CertifiedIdentity> {
    const runtime =
        await getIamIntegrationRuntime();

    const suffix =
        randomUUID()
            .replaceAll("-", "");

    const invitationId =
        `invitation_${suffix}`;

    const invitationToken =
        `invitation-token-${suffix}`;

    const membershipId =
        `membership_${suffix}`;

    const tenantId =
        `tenant_${suffix}`;

    const email =
        `identity-${suffix}@example.com`;

    const now =
        new Date();

    const expiresAt =
        new Date(
            now.getTime() + 60 * 60 * 1000,
        );

    await seedKnownInvitation(
        runtime.database.database,
        {
            invitationId,
            targetTenantId:
                tenantId,
            invitedEmail:
                email,
            invitationToken,
            expiresAt,
        },
    );

    const response =
        await postJson(
            runtime,
            "/api/v1/identity/invitation-sign-up",
            {
                invitationToken,
                email,
                password:
                    IDENTITY_TEST_PASSWORD,
                displayName:
                    "Identity Certification",
                locale:
                    "en-CA",
                timezone:
                    "America/Toronto",
            },
        );

    expectStatus(
        response,
        201,
    );

    const result =
        response.json<{
            readonly userId: string;
            readonly sessionId: string;
        }>();

    const verification =
        await runtime.database.database
            .collection("identity_email_verifications")
            .findOne({
                userId:
                    result.userId,
            });

    const capture =
        await runtime.database.database
            .collection("identity_acceptance_captures")
            .findOne({
                kind:
                    "email_verification",
                email,
            });

    if (
        typeof verification?.verificationId !== "string"
        || typeof capture?.token !== "string"
    ) {
        throw new Error(
            "Identity signup did not create its verification lifecycle.",
        );
    }

    return {
        userId:
            result.userId,
        sessionId:
            result.sessionId,
        verificationId:
            verification.verificationId,
        verificationToken:
            capture.token,
        invitationId,
        invitationToken,
        membershipId:
            membershipId,
        tenantId,
        email,
        password:
            IDENTITY_TEST_PASSWORD,
    };
}

export async function createActiveIdentity(): Promise<CertifiedIdentity> {
    const identity =
        await createPendingIdentity();

    const runtime =
        await getIamIntegrationRuntime();

    const response =
        await postJson(
            runtime,
            "/api/v1/identity/verify-email",
            {
                verificationId:
                    identity.verificationId,
                verificationToken:
                    identity.verificationToken,
            },
        );

    expectStatus(
        response,
        200,
    );

    return identity;
}

export async function signInIdentity(
    identity: CertifiedIdentity,
    password = identity.password,
): Promise<string> {
    const runtime =
        await getIamIntegrationRuntime();

    const response =
        await postJson(
            runtime,
            "/api/v1/identity/sign-in",
            {
                email:
                    identity.email,
                password,
            },
        );

    expectStatus(
        response,
        200,
    );

    return response.json<{
        readonly sessionId: string;
    }>().sessionId;
}

export async function requestPasswordReset(
    identity: CertifiedIdentity,
): Promise<string> {
    const runtime =
        await getIamIntegrationRuntime();

    const response =
        await postJson(
            runtime,
            "/api/v1/identity/request-password-reset",
            {
                email:
                    identity.email,
            },
        );

    expectStatus(
        response,
        200,
    );

    const capture =
        await runtime.database.database
            .collection("identity_acceptance_captures")
            .findOne({
                kind:
                    "password_reset",
                email:
                    identity.email,
            });

    if (typeof capture?.token !== "string") {
        throw new Error(
            "Identity password-reset request did not create its provider capture.",
        );
    }

    return capture.token;
}

export async function prepareProviderIdentityReadContext(
    identity: CertifiedIdentity,
): Promise<void> {
    const runtime =
        await getIamIntegrationRuntime();

    const now =
        new Date()
            .toISOString();

    await runtime.database.database
        .collection("membership_memberships")
        .updateOne(
            { membershipId: identity.membershipId },
            { $set: {
                membershipId: identity.membershipId,
                identityId: identity.userId,
                tenantId: identity.tenantId,
                membershipType: "provider_operator",
                status: "active",
                activatedAt: now,
                createdAt: now,
                updatedAt: now,
            } },
            { upsert: true },
        );

    await runtime.database.database
        .collection("membership_contexts")
        .updateOne(
            { identityId: identity.userId },
            { $set: {
                identityId: identity.userId,
                activeMembershipId: identity.membershipId,
                activeTenantId: identity.tenantId,
                activatedAt: now,
                updatedAt: now,
            } },
            { upsert: true },
        );

    await runtime.database.database
        .collection("access_known_identities")
        .updateOne(
            { identityId: identity.userId },
            { $set: {
                identityId: identity.userId,
                status: "active",
                activatedAt: now,
                updatedAt: now,
            } },
            { upsert: true },
        );

    await runtime.database.database
        .collection("access_known_memberships")
        .updateOne(
            { membershipId: identity.membershipId },
            { $set: {
                membershipId: identity.membershipId,
                identityId: identity.userId,
                tenantId: identity.tenantId,
                membershipType: "provider_operator",
                status: "active",
                activatedAt: now,
                updatedAt: now,
            } },
            { upsert: true },
        );

    await runtime.database.database
        .collection("access_known_tenants")
        .updateOne(
            {
                tenantId:
                    identity.tenantId,
            },
            {
                $set: {
                    tenantId:
                        identity.tenantId,
                    status:
                        "active",
                    createdAt:
                        now,
                    updatedAt:
                        now,
                },
            },
            {
                upsert:
                    true,
            },
        );
}

export async function grantProviderIdentityReads(
    identity: CertifiedIdentity,
): Promise<void> {
    await prepareProviderIdentityReadContext(
        identity,
    );

    const runtime =
        await getIamIntegrationRuntime();

    const now =
        new Date()
            .toISOString();

    for (const action of ["view", "list"] as const) {
        const permissionId =
            `permission_identity_identity_${action}`;

        await runtime.database.database
            .collection("access_permissions")
            .updateOne(
                {
                    permissionId,
                },
                {
                    $set: {
                        permissionId,
                        service:
                            "identity",
                        resource:
                            "identity",
                        action,
                        displayName:
                            `Identity ${action}`,
                        description:
                            `Allows Identity ${action} certification.`,
                        classification:
                            "administrative",
                        createdAt:
                            now,
                    },
                },
                {
                    upsert:
                        true,
                },
            );

        await runtime.database.database
            .collection("access_permission_assignments")
            .insertOne({
                assignmentId:
                    `assignment_${action}_${randomUUID()}`,
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
                    "system:identity-integration",
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
}

export async function postJson(
    runtime: IamIntegrationRuntime,
    url: string,
    payload: Record<string, unknown>,
    sessionId?: string,
): Promise<LightMyRequestResponse> {
    return await runtime.server.app.inject({
        method:
            "POST",
        url,
        headers: {
            "content-type":
                "application/json",
            ...(sessionId === undefined
                ? {}
                : {
                    authorization:
                        `Bearer ${sessionId}`,
                }),
        },
        payload,
    });
}

export async function getJson(
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

export function expectStatus(
    response: LightMyRequestResponse,
    expectedStatusCode: number,
): void {
    if (response.statusCode !== expectedStatusCode) {
        throw new Error(
            `Expected HTTP ${expectedStatusCode}, received ${response.statusCode}: ${response.body}`,
        );
    }
}

export async function expectNoSensitivePersistence(
    values: readonly string[],
): Promise<void> {
    const runtime =
        await getIamIntegrationRuntime();

    const records = [
        ...await runtime.database.findEvents(),
        ...await runtime.database.findOutboxRecords(),
    ];

    const serialized =
        JSON.stringify(records);

    for (const value of values) {
        if (serialized.includes(value)) {
            throw new Error(
                "Sensitive provider data leaked into an event or outbox record.",
            );
        }
    }
}
