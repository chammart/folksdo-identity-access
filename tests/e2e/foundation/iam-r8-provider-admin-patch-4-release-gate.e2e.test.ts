// tests/e2e/foundation/iam-r8-provider-admin-patch-4-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// R8 PATCH 4 — PROVIDER ADMIN CONFIGURATION / METRICS RELEASE GATE
// -----------------------------------------------------------------------------
// Real IAM HTTP + Access authorization + Engine/Mongo-backed policy state.
// No HTTP mocks. Provider Admin consumes these contracts without becoming IAM authority.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

const policy = {
    authentication: { passwordSignInEnabled: true },
    sessions: { maxActiveSessions: 8, sessionLifetimeMinutes: 60 },
    verification: { emailVerificationRequired: true },
    invitations: { defaultExpiryHours: 72, maxExpiryHours: 168 },
    recovery: { passwordRecoveryEnabled: true, recoveryRequestExpiryMinutes: 30 },
    security: { suspendRevokesSessions: true },
    tenantDelegation: {
        sessions: { maxActiveSessions: { min: 1, max: 20 }, sessionLifetimeMinutes: { min: 15, max: 1440 } },
        invitations: { defaultExpiryHours: { min: 1, max: 168 } },
        recovery: { recoveryRequestExpiryMinutes: { min: 5, max: 120 } },
    },
};

describe("R8 Patch 4 — Provider Admin release gate", () => {
    it("serves safe Provider configuration, effective policy and canonical metrics", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            ["iam.policy.view", "policy", "view"],
            ["iam.policy.update", "policy", "update"],
            ["iam.tenant-policy.view", "tenant-policy", "view"],
            ["iam.metrics.view", "metrics", "view"],
        ]);
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(admin.sessionId);

        const updated = await runtime.server.app.inject({ method: "PUT", url: "/api/v1/admin/iam/policy", headers, payload: policy });
        expect(updated.statusCode).toBe(200);
        expect(updated.json()).toMatchObject({ policyId: "provider-default", status: "active", version: expect.any(Number), ...policy });
        assertSafe(updated.body);

        const providerPolicy = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/policy", headers });
        expect(providerPolicy.statusCode).toBe(200);
        expect(providerPolicy.json()).toMatchObject({ policyId: "provider-default", ...policy });
        assertSafe(providerPolicy.body);

        const effective = await runtime.server.app.inject({ method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/effective-policy`, headers });
        expect(effective.statusCode).toBe(200);
        expect(effective.json()).toMatchObject({ tenantId: admin.tenantId, providerPolicyVersion: expect.any(Number), authentication: policy.authentication, sessions: policy.sessions });
        assertSafe(effective.body);

        const providerMetrics = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/metrics", headers });
        expect(providerMetrics.statusCode).toBe(200);
        expect(providerMetrics.json()).toMatchObject({ scope: { type: "provider" }, identities: { total: expect.any(Number) }, memberships: { total: expect.any(Number) }, authorization: { denials: expect.any(Number) }, processing: { failures: expect.any(Number) } });
        assertSafe(providerMetrics.body);

        const tenantMetrics = await runtime.server.app.inject({ method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/metrics`, headers });
        expect(tenantMetrics.statusCode).toBe(200);
        expect(tenantMetrics.json()).toMatchObject({ scope: { type: "tenant", tenantId: admin.tenantId }, memberships: { total: expect.any(Number) } });
        assertSafe(tenantMetrics.body);
    });

    it("denies Patch 4 Provider administration contracts without explicit Access authority", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(admin.sessionId);
        const responses = await Promise.all([
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/policy", headers }),
            runtime.server.app.inject({ method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/effective-policy`, headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/metrics", headers }),
        ]);
        for (const response of responses) expect(response.statusCode).toBe(403);
    });
});

async function grant(identityId: string, membershipId: string, tenantId: string, permissions: readonly (readonly [string, string, string])[]) {
    const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
    for (const [permissionId, resource, action] of permissions) {
        await runtime.database.database.collection("access_permissions").updateOne({ permissionId }, { $set: { permissionId, service: "iam", resource, action, displayName: permissionId, description: `Allows ${permissionId}.`, classification: "administrative", createdAt: now } }, { upsert: true });
        await runtime.database.database.collection("access_permission_assignments").insertOne({ assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId, permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active", assignedBy: "system:r8-provider-admin-patch-4-release-gate", effectiveFrom: now, activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now });
    }
}
function auth(sessionId: string) { return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" }; }
function assertSafe(body: string): void { expect(body.toLowerCase()).not.toMatch(/passwordhash|secret|token|connectionstring|providercredentialid|providersessionid/); }
