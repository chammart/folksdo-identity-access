// tests/e2e/foundation/iam-r7-operational-metrics.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R7 PATCH 2 — OPERATIONAL METRICS
// -----------------------------------------------------------------------------
// Real canonical state + HTTP authorization. No HTTP mocks.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R7 Operational Metrics", () => {
    it("returns safe Provider-wide IAM operational metrics", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, "iam.metrics.view");
        const runtime = await getIamIntegrationRuntime();
        const response = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/metrics", headers: auth(admin.sessionId),
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            scope: { type: "provider" },
            identities: { total: expect.any(Number), active: expect.any(Number), suspended: expect.any(Number) },
            authentication: { lifecycleEvents: expect.any(Number) },
            sessions: { active: expect.any(Number) },
            memberships: { total: expect.any(Number), active: expect.any(Number) },
            invitations: { pending: expect.any(Number) },
            authorization: {
                accessLifecycleEvents: expect.any(Number),
                activeRoleAssignments: expect.any(Number),
                activeDirectAssignments: expect.any(Number),
                denials: expect.any(Number),
            },
            processing: { failures: expect.any(Number) },
        });
        expect(JSON.stringify(response.json()).toLowerCase()).not.toMatch(/password|secret|token|uri|connection/);
    });

    it("returns tenant-scoped metrics and denies foreign tenant access", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, "iam.metrics.view");
        const runtime = await getIamIntegrationRuntime();

        const response = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/metrics`, headers: auth(admin.sessionId),
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            scope: { type: "tenant", tenantId: admin.tenantId },
            memberships: { total: expect.any(Number), active: expect.any(Number) },
        });

        const denied = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/tenant_${randomUUID()}/iam/metrics`, headers: auth(admin.sessionId),
        });
        expect(denied.statusCode).toBe(403);
    });
});

async function grant(identityId: string, membershipId: string, tenantId: string, permissionId: string) {
    const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
    await runtime.database.database.collection("access_permissions").updateOne(
        { permissionId },
        { $set: {
            permissionId, service: "iam", resource: "metrics",
            action: permissionId.endsWith("provider-view") ? "view" : "view",
            displayName: permissionId, description: `Allows ${permissionId}.`,
            classification: "administrative", createdAt: now,
        } },
        { upsert: true },
    );
    await runtime.database.database.collection("access_permission_assignments").insertOne({
        assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId,
        permissionId, assignmentType: "grant", scope: { scopeType: "tenant" },
        status: "active", assignedBy: "system:r7-metrics-certification", effectiveFrom: now,
        activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now,
    });
}
function auth(sessionId: string) {
    return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" };
}
