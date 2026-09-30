// tests/e2e/foundation/iam-r6-provider-policy-foundation.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R6 PATCH 1 — PROVIDER IAM POLICY FOUNDATION
// -----------------------------------------------------------------------------
// Real IAM HTTP + Access authorization + Engine + MongoDB + outbox. No mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

const policy = {
    authentication: { passwordSignInEnabled: true },
    sessions: { maxActiveSessions: 8, sessionLifetimeMinutes: 720 },
    verification: { emailVerificationRequired: true },
    invitations: { defaultExpiryHours: 72, maxExpiryHours: 168 },
    recovery: { passwordRecoveryEnabled: true, recoveryRequestExpiryMinutes: 30 },
    security: { suspendRevokesSessions: true },
};

describe("IAM R6 Provider IAM Policy Foundation", () => {
    it("authorizes, persists and reads safe provider-owned IAM business policy with event + outbox", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            { permissionId: "iam.policy.view", action: "view" },
            { permissionId: "iam.policy.update", action: "update" },
        ]);

        const updated = await request(admin.sessionId, "PUT", policy);
        expect(updated.statusCode).toBe(200);
        expect(updated.json()).toMatchObject({ policyId: "provider-default", version: 1, status: "active", ...policy, updatedBy: admin.identity.userId });

        const read = await request(admin.sessionId, "GET");
        expect(read.statusCode).toBe(200);
        expect(read.json()).toMatchObject({ policyId: "provider-default", version: 1, ...policy });

        const stored = await runtime.database.database.collection("iam_provider_policies").findOne({ policyId: "provider-default" });
        expect(stored).toMatchObject({ version: 1, ...policy });
        const events = await runtime.database.findEvents({ aggregateType: "iam.provider-policy", aggregateId: "provider-default", eventType: "iam.provider-policy.updated" });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ metadata: expect.objectContaining({ actorId: admin.identity.userId }) });
        const outbox = await runtime.database.findOutboxRecords({ subject: "iam.provider_policy.updated" });
        expect(outbox).toHaveLength(1);

        for (const response of [updated, read]) {
            expect(response.body).not.toContain("secret");
            expect(response.body).not.toContain("passwordHash");
            expect(response.body).not.toContain("connectionString");
            expect(response.body).not.toContain("apiKey");
        }
    });

    it("rejects runtime/infrastructure configuration and callers without provider policy authority", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const denied = await request(admin.sessionId, "PUT", policy);
        expect(denied.statusCode).toBe(403);

        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [{ permissionId: "iam.policy.update", action: "update" }]);
        const invalid = await request(admin.sessionId, "PUT", { ...policy, runtime: { signingSecret: "must-never-be-policy" } });
        expect(invalid.statusCode).toBe(400);
        expect(invalid.json()).toMatchObject({ error: { code: "validation_error" } });
        expect(await runtime.database.database.collection("iam_provider_policies").countDocuments({})).toBe(0);
    });

    async function grant(identityId: string, membershipId: string, tenantId: string, permissions: readonly { permissionId: string; action: string }[]) {
        const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
        for (const permission of permissions) {
            await runtime.database.database.collection("access_permissions").updateOne({ permissionId: permission.permissionId }, { $set: { ...permission, service: "iam", resource: "policy", displayName: permission.permissionId, description: `Allows ${permission.permissionId}.`, classification: "administrative", createdAt: now } }, { upsert: true });
            await runtime.database.database.collection("access_permission_assignments").insertOne({ assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId, permissionId: permission.permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active", assignedBy: "system:r6-policy-certification", effectiveFrom: now, activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now });
        }
    }
    async function request(sessionId: string, method: "GET" | "PUT", payload?: Record<string, unknown>) {
        const runtime = await getIamIntegrationRuntime();
        return await runtime.server.app.inject({ method, url: "/api/v1/admin/iam/policy", headers: { authorization: `Bearer ${sessionId}`, "content-type": "application/json" }, ...(payload === undefined ? {} : { payload }) });
    }
});
