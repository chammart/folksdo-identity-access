// tests/e2e/foundation/iam-r6-tenant-policy-boundary.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R6 PATCH 2 — TENANT IAM SETTINGS & POLICY BOUNDARY
// -----------------------------------------------------------------------------
// Real HTTP + Membership + Access + Engine + MongoDB + outbox. No HTTP mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R6 Tenant IAM Settings & Policy Boundary", () => {
    it("enforces Provider delegation and derives effective tenant policy", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            { permissionId: "iam.policy.update", resource: "policy", action: "update" },
            { permissionId: "iam.tenant-policy.view", resource: "tenant-policy", action: "view" },
            { permissionId: "iam.tenant-policy.update", resource: "tenant-policy", action: "update" },
        ]);
        const provider = {
            authentication: { passwordSignInEnabled: true },
            sessions: { maxActiveSessions: 10, sessionLifetimeMinutes: 720 },
            verification: { emailVerificationRequired: true },
            invitations: { defaultExpiryHours: 72, maxExpiryHours: 168 },
            recovery: { passwordRecoveryEnabled: true, recoveryRequestExpiryMinutes: 30 },
            security: { suspendRevokesSessions: true },
            tenantDelegation: {
                sessions: { maxActiveSessions: { min: 2, max: 8 } },
                invitations: { defaultExpiryHours: { min: 24, max: 120 } },
            },
        };
        const providerUpdate = await runtime.server.app.inject({
            method: "PUT", url: "/api/v1/admin/iam/policy",
            headers: auth(admin.sessionId), payload: provider,
        });
        expect(providerUpdate.statusCode).toBe(200);

        const updated = await tenant(admin.sessionId, admin.tenantId, "PUT", {
            sessions: { maxActiveSessions: 6 },
            invitations: { defaultExpiryHours: 48 },
        });
        expect(updated.statusCode).toBe(200);
        expect(updated.json()).toMatchObject({
            tenantId: admin.tenantId, version: 1, providerPolicyVersion: 1,
            overrides: { sessions: { maxActiveSessions: 6 }, invitations: { defaultExpiryHours: 48 } },
            updatedBy: admin.identity.userId,
        });

        const effective = await tenant(admin.sessionId, admin.tenantId, "GET", undefined, true);
        expect(effective.statusCode).toBe(200);
        expect(effective.json()).toMatchObject({
            tenantId: admin.tenantId,
            authentication: provider.authentication,
            sessions: { maxActiveSessions: 6, sessionLifetimeMinutes: 720 },
            invitations: { defaultExpiryHours: 48, maxExpiryHours: 168 },
            recovery: provider.recovery,
            security: provider.security,
        });

        const stored = await runtime.database.database.collection("iam_tenant_policies").findOne({ tenantId: admin.tenantId });
        expect(stored).toMatchObject({ version: 1, providerPolicyVersion: 1 });
        const events = await runtime.database.findEvents({ aggregateType: "iam.tenant-policy", aggregateId: admin.tenantId, eventType: "iam.tenant-policy.updated" });
        expect(events).toHaveLength(1);
        const outbox = await runtime.database.findOutboxRecords({ subject: "iam.tenant_policy.updated" });
        expect(outbox).toHaveLength(1);

        const rejected = await tenant(admin.sessionId, admin.tenantId, "PUT", {
            recovery: { recoveryRequestExpiryMinutes: 45 },
        });
        expect(rejected.statusCode).toBe(400);
        expect(rejected.json()).toMatchObject({ error: { code: "validation_error" } });
        expect(await runtime.database.database.collection("iam_tenant_policies").findOne({ tenantId: admin.tenantId })).toMatchObject({ version: 1 });
    });

    it("does not allow a tenant session to operate another tenant policy", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            { permissionId: "iam.tenant-policy.view", resource: "tenant-policy", action: "view" },
        ]);
        const otherTenantId = `tenant_${randomUUID()}`;
        const denied = await tenant(admin.sessionId, otherTenantId, "GET", undefined, true);
        expect(denied.statusCode).toBe(403);
    });
});

async function grant(identityId: string, membershipId: string, tenantId: string, permissions: readonly { permissionId: string; resource: string; action: string }[]) {
    const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
    for (const permission of permissions) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId: permission.permissionId },
            { $set: { ...permission, service: "iam", displayName: permission.permissionId, description: `Allows ${permission.permissionId}.`, classification: "administrative", createdAt: now } },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId,
            permissionId: permission.permissionId, assignmentType: "grant", scope: { scopeType: "tenant" },
            status: "active", assignedBy: "system:r6-policy-certification", effectiveFrom: now,
            activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now,
        });
    }
}
async function tenant(sessionId: string, tenantId: string, method: "GET" | "PUT", payload?: Record<string, unknown>, effective = false) {
    const runtime = await getIamIntegrationRuntime();
    return await runtime.server.app.inject({
        method, url: `/api/v1/tenants/${tenantId}/iam/${effective ? "effective-policy" : "settings"}`,
        headers: auth(sessionId), ...(payload === undefined ? {} : { payload }),
    });
}
function auth(sessionId: string) { return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" }; }
