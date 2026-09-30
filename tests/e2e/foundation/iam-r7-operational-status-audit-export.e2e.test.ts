// tests/e2e/foundation/iam-r7-operational-status-audit-export.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R7 PATCH 3 — OPERATIONAL STATUS & ADMINISTRATIVE AUDIT EXPORT
// -----------------------------------------------------------------------------
// Real HTTP + Access + Membership + Engine event authority. No HTTP mocks.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

const expectedIamEnvironment =
    process.env.IAM_ENVIRONMENT?.trim()
    || process.env.NODE_ENV?.trim()
    || "development";

describe("IAM R7 Operational Status & Administrative Audit Export", () => {
    it("composes safe Provider operational status", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, "iam.status.view", "status", "view");
        const runtime = await getIamIntegrationRuntime();
        const response = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/status", headers: auth(admin.sessionId),
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            service: { id: "folksdo-identity-access-integration", environment: expectedIamEnvironment, version: "development" },
            release: { releaseId: "local", version: "development" },
            health: { status: "alive" },
            readiness: { status: "ready" },
            processing: { pendingOutbox: expect.any(Number), recentFailureCount: expect.any(Number) },
            recentOperationalFailures: expect.any(Array),
        });
        expect(JSON.stringify(response.json()).toLowerCase()).not.toMatch(/password|secret|tokenhash|connectionuri|mongodb_uri|nats_url/);
    });

    it("exports bounded Provider and Tenant IAM administration activity without raw payloads", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, "iam.audit.export", "audit", "export");
        const runtime = await getIamIntegrationRuntime();

        const provider = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/audit-export?limit=5", headers: auth(admin.sessionId),
        });
        expect(provider.statusCode).toBe(200);
        expect(provider.json()).toMatchObject({
            format: "iam-administration-activity-v1", scope: { type: "provider" }, limit: 5, items: expect.any(Array),
        });

        const tenant = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/audit-export?limit=5`, headers: auth(admin.sessionId),
        });
        expect(tenant.statusCode).toBe(200);
        expect(tenant.json()).toMatchObject({
            format: "iam-administration-activity-v1", scope: { type: "tenant", tenantId: admin.tenantId }, limit: 5,
        });
        expect(JSON.stringify(tenant.json())).not.toContain('"payload"');
        expect(JSON.stringify(tenant.json())).not.toContain('"metadata"');

        const invalid = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/audit-export?limit=1001", headers: auth(admin.sessionId),
        });
        expect(invalid.statusCode).toBe(400);
        expect(invalid.json()).toMatchObject({ error: { code: "validation_error" } });

        const foreign = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/tenant_${randomUUID()}/iam/audit-export`, headers: auth(admin.sessionId),
        });
        expect(foreign.statusCode).toBe(403);
    });
});

async function grant(identityId: string, membershipId: string, tenantId: string, permissionId: string, resource: string, action: string) {
    const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
    await runtime.database.database.collection("access_permissions").updateOne(
        { permissionId },
        { $set: { permissionId, service: "iam", resource, action, displayName: permissionId, description: `Allows ${permissionId}.`, classification: "administrative", createdAt: now } },
        { upsert: true },
    );
    await runtime.database.database.collection("access_permission_assignments").insertOne({
        assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId, permissionId,
        assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active",
        assignedBy: "system:r7-p3-certification", effectiveFrom: now, activatedAt: now,
        suspensionSources: [], createdAt: now, updatedAt: now,
    });
}
function auth(sessionId: string) { return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" }; }
