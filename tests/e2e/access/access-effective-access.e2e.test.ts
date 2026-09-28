// tests/e2e/access/access-effective-access.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ R2 EFFECTIVE ACCESS HTTP CERTIFICATION
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { waitForIamCondition } from "../../integration/support/iam-outbox-assertions";
import { createActiveIdentity } from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { membershipPost } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { accessHttp, createAccessAdministrativeContext } from "./support/access-authenticated-fixtures";

describe("Access™ R2 effective access administration", () => {
    it("returns role-derived, direct, restriction, effective-date and expiry facts", async () => {
        const c = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const db = runtime.database.database;
        const now = new Date();
        const effectiveFrom = new Date(now.getTime()-60_000).toISOString();
        const expiresAt = new Date(now.getTime()+3_600_000).toISOString();
        // Keep the administrator and inspected subject distinct. Create the
        // target through the real Membership HTTP lifecycle, then wait for the
        // Membership -> Access reaction to establish the Access-known fact.
        const targetIdentity = await createActiveIdentity();
        const targetIdentityId = targetIdentity.userId;
        await waitForKnownIdentityStatus(runtime, targetIdentityId, "active");

        const createTargetMembership = await membershipPost(
            runtime,
            "/api/v1/membership",
            {
                identityId: targetIdentityId,
                tenantId: c.tenantId,
                membershipType: "member",
                activate: true,
            },
            c.sessionId,
        );
        expect(createTargetMembership.statusCode).toBe(201);
        const targetMembershipId = String(createTargetMembership.json().membershipId);
        await waitForKnownMembershipStatus(runtime, targetMembershipId, "active");

        const directPermissionId = `cert.direct.${randomUUID()}`;
        const rolePermissionId = `cert.role.${randomUUID()}`;
        const roleId = `role_${randomUUID()}`;
        const roleAssignmentId = `assignment_${randomUUID()}`;
        const directAssignmentId = `assignment_${randomUUID()}`;
        for (const permissionId of [directPermissionId, rolePermissionId]) {
            const [service, resource, action] = permissionId.split(".");
            await db.collection("access_permissions").insertOne({ permissionId, service, resource, action, displayName: permissionId, description: permissionId, classification: "business", createdAt: effectiveFrom });
        }
        await db.collection("access_roles").insertOne({ roleId, roleKey: `cert-${randomUUID()}`, roleName: "R2 Effective Access", description: "R2", roleType: "tenant", tenantId: c.tenantId, lifecycleStatus: "active", permissionIds: [rolePermissionId], createdBy: c.identity.userId, createdAt: effectiveFrom, updatedAt: effectiveFrom, activatedAt: effectiveFrom });
        await db.collection("access_role_assignments").insertOne({ assignmentId: roleAssignmentId, identityId: targetIdentityId, membershipId: targetMembershipId, tenantId: c.tenantId, roleId, status: "active", assignedBy: c.identity.userId, effectiveFrom, expiresAt, suspensionSources: [], createdAt: effectiveFrom, updatedAt: effectiveFrom });
        await db.collection("access_permission_assignments").insertOne({ assignmentId: directAssignmentId, identityId: targetIdentityId, membershipId: targetMembershipId, tenantId: c.tenantId, permissionId: directPermissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active", assignedBy: c.identity.userId, effectiveFrom, expiresAt, suspensionSources: [], createdAt: effectiveFrom, updatedAt: effectiveFrom });
        const restrictionId = `restriction_${randomUUID()}`;
        await db.collection("access_restrictions").insertOne({ restrictionId, tenantId: c.tenantId, target: { targetType: "membership", membershipId: targetMembershipId }, restrictionReason: "R2 certification restriction", status: "active", effectiveFrom, expiresAt, createdBy: c.identity.userId, createdAt: effectiveFrom, updatedAt: effectiveFrom });

        const response = await accessHttp(c.sessionId, "GET", `/effective-access/${encodeURIComponent(targetMembershipId)}`);
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({ identityId: targetIdentityId, membershipId: targetMembershipId, tenantId: c.tenantId, membershipIsValid: true, effectivePermissions: expect.arrayContaining([
            expect.objectContaining({ permission: expect.objectContaining({ permissionId: rolePermissionId }), source: "role_assignment", sourceId: roleAssignmentId, effectiveFrom, expiresAt }),
            expect.objectContaining({ permission: expect.objectContaining({ permissionId: directPermissionId }), source: "permission_assignment", sourceId: directAssignmentId, effectiveFrom, expiresAt }),
        ]), restrictions: expect.arrayContaining([expect.objectContaining({ restrictionId, effectiveFrom, expiresAt })]), evaluatedAt: expect.any(String) });
    });

    it("denies a foreign-tenant membership", async () => {
        const c = await createAccessAdministrativeContext();
        const foreign = await createAccessAdministrativeContext();
        const response = await accessHttp(c.sessionId, "GET", `/effective-access/${encodeURIComponent(foreign.membershipId)}`);
        expect(response.statusCode).toBe(403);
    });
});

async function waitForKnownMembershipStatus(
    runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>,
    membershipId: string,
    status: string,
): Promise<void> {
    const membership = await waitForIamCondition(
        async () => {
            const candidate = await runtime.database.database
                .collection("access_known_memberships")
                .findOne({ membershipId });

            return candidate?.status === status
                ? candidate
                : undefined;
        },
        undefined,
        `Access known Membership ${membershipId} to become ${status}`,
    );

    expect(membership).toMatchObject({ membershipId, status });
}

async function waitForKnownIdentityStatus(
    runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>,
    identityId: string,
    status: string,
): Promise<void> {
    const identity = await waitForIamCondition(
        async () => {
            const candidate = await runtime.database.database
                .collection("access_known_identities")
                .findOne({ identityId });

            return candidate?.status === status
                ? candidate
                : undefined;
        },
        undefined,
        `Access known Identity ${identityId} to become ${status}`,
    );

    expect(identity).toMatchObject({ identityId, status });
}
