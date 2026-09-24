// services/access/tests/integration/access-integration-fixtures.ts
// -----------------------------------------------------------------------------
// ACCESS INTEGRATION FIXTURES
// -----------------------------------------------------------------------------
// Real Access runtime fixtures for isolated IAM certification.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";

export async function getAccessUseCases() {
    const runtime = await getIamIntegrationRuntime();
    const useCases = runtime.server.accessRuntime.components.useCases;
    if (useCases === undefined) throw new Error("Access integration runtime did not compose use cases.");
    return { runtime, useCases };
}

export async function createAccessKnownMembership(input?: { status?: "pending" | "active"; tenantId?: string; identityId?: string }) {
    const runtime = await getIamIntegrationRuntime();
    const now = new Date().toISOString();
    const membership = {
        membershipId: `membership_${randomUUID()}`,
        identityId: input?.identityId ?? `identity_${randomUUID()}`,
        tenantId: input?.tenantId ?? `tenant_${randomUUID()}`,
        membershipType: "member",
        status: input?.status ?? "active",
        activatedAt: now,
        updatedAt: now,
    };
    await runtime.database.database.collection("access_known_memberships").insertOne(membership);
    return membership;
}

export async function createAccessPermission(key = `certification.resource-${randomUUID()}.read`) {
    const { useCases } = await getAccessUseCases();
    const [service, resource, action] = key.split(".");
    return await useCases.permissions.create.execute({
        service,
        resource,
        action,
        displayName: key,
        description: `Certification permission ${key}.`,
        classification: "tenant",
        createdBy: "system:access-integration",
    });
}

export async function createAccessRole(input?: { tenantId?: string; permissionIds?: readonly string[] }) {
    const { useCases } = await getAccessUseCases();
    return await useCases.roles.create.execute({
        key: `certification-role-${randomUUID()}`,
        roleType: input?.tenantId === undefined ? "system" : "tenant",
        tenantId: input?.tenantId,
        name: `Certification Role ${randomUUID()}`,
        description: "Access integration certification role.",
        permissionIds: input?.permissionIds ?? [],
        createdBy: "system:access-integration",
    });
}

export async function createAccessPolicy(input?: { tenantId?: string }) {
    const { useCases } = await getAccessUseCases();
    return await useCases.policies.create.execute({
        name: `Certification Policy ${randomUUID()}`,
        scope: input?.tenantId === undefined ? "platform" : "tenant",
        tenantId: input?.tenantId,
        evaluationRules: {
            requireActiveIdentity: true,
            requireActiveMembership: input?.tenantId !== undefined,
        },
        createdBy: "system:access-integration",
    });
}

export async function createAccessRestriction(input?: { tenantId?: string; membershipId?: string }) {
    const { useCases } = await getAccessUseCases();
    const membershipId = input?.membershipId ?? `membership_${randomUUID()}`;
    return await useCases.restrictions.create.execute({
        target: {
            targetType: "membership",
            membershipId,
        },
        tenantId: input?.tenantId,
        restrictionReason: "Access integration certification restriction.",
        createdBy: "system:access-integration",
    });
}
