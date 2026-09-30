// tests/e2e/foundation/iam-r7-managed-service-operations-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R7 — MANAGED SERVICE OPERATIONS & METRICS RELEASE GATE
// -----------------------------------------------------------------------------
// Certifies the independently managed IAM backend operational surface using
// real HTTP, Identity sessions, Membership, Access, Engine and MongoDB.
// No HTTP mocks. No duplicate operational/audit source of truth.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R7 Managed Service Operations & Metrics release gate", () => {
    it("certifies Provider operations, Tenant isolation, safe metrics/status and bounded audit export", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            ["iam.service.view", "service", "view"],
            ["iam.service.release-view", "service", "release-view"],
            ["iam.metrics.view", "metrics", "view"],
            ["iam.status.view", "status", "view"],
            ["iam.audit.export", "audit", "export"],
        ]);
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(admin.sessionId);

        const service = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/service", headers });
        const release = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/release", headers });
        const ready = await runtime.server.app.inject({ method: "GET", url: "/health/ready" });
        const providerMetrics = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/metrics", headers });
        const tenantMetrics = await runtime.server.app.inject({ method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/metrics`, headers });
        const status = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/status", headers });
        const providerExport = await runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/audit-export?limit=10&capability=access", headers });
        const tenantExport = await runtime.server.app.inject({ method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/audit-export?limit=10`, headers });

        const successfulResponses = [
            ["service", service],
            ["release", release],
            ["ready", ready],
            ["providerMetrics", providerMetrics],
            ["tenantMetrics", tenantMetrics],
            ["status", status],
            ["providerExport", providerExport],
            ["tenantExport", tenantExport],
        ] as const;
        for (const [name, response] of successfulResponses) {
            expect({ name, statusCode: response.statusCode, body: response.body }).toMatchObject({
                name,
                statusCode: 200,
            });
            assertSafe(response.body);
        }

        expect(service.json()).toMatchObject({
            service: {
                id: "folksdo-identity-access-integration",
                environment: "test",
                version: "development",
                capabilities: ["identity", "membership", "access"],
                runtimeStatus: "ready",
            },
            dependencies: {
                platformRuntime: { status: "ready" },
                accessRuntime: { status: "ready" },
            },
        });
        expect(release.json()).toMatchObject({
            releaseId: "local", version: "development", environment: "test",
        });
        expect(ready.json()).toMatchObject({
            status: "ready",
            dependencies: { platformRuntime: true, accessRuntime: true },
            operationalDependencies: {
                platformRuntime: { status: "ready" },
                accessRuntime: { status: "ready" },
            },
        });

        expect(providerMetrics.json()).toMatchObject({
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
        expect(tenantMetrics.json()).toMatchObject({
            scope: { type: "tenant", tenantId: admin.tenantId },
        });

        expect(status.json()).toMatchObject({
            service: { id: "folksdo-identity-access-integration", environment: "test" },
            release: { releaseId: "local", version: "development" },
            health: { status: "alive" },
            readiness: { status: "ready" },
            processing: { pendingOutbox: expect.any(Number), recentFailureCount: expect.any(Number) },
            recentOperationalFailures: expect.any(Array),
        });

        expect(providerExport.json()).toMatchObject({
            format: "iam-administration-activity-v1",
            scope: { type: "provider" },
            limit: 10,
            items: expect.any(Array),
        });
        expect(tenantExport.json()).toMatchObject({
            format: "iam-administration-activity-v1",
            scope: { type: "tenant", tenantId: admin.tenantId },
            limit: 10,
            items: expect.any(Array),
        });
        for (const item of providerExport.json().items as Array<Record<string, unknown>>) {
            expect(String(item.eventType)).toMatch(/^access\./);
        }
        expect(providerExport.body).not.toContain('"payload"');
        expect(providerExport.body).not.toContain('"metadata"');
        expect(tenantExport.body).not.toContain('"payload"');
        expect(tenantExport.body).not.toContain('"metadata"');

        // Hardened validation contract.
        const invalidLimit = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/audit-export?limit=1001", headers,
        });
        expect(invalidLimit.statusCode).toBe(400);
        expect(invalidLimit.json()).toMatchObject({ error: { code: "validation_error" } });

        const invalidRange = await runtime.server.app.inject({
            method: "GET", url: "/api/v1/admin/iam/audit-export?from=not-a-date", headers,
        });
        expect(invalidRange.statusCode).toBe(400);
        expect(invalidRange.json()).toMatchObject({ error: { code: "validation_error" } });

        // Tenant authority never becomes Provider authority and never crosses tenants.
        const foreignTenant = `tenant_${randomUUID()}`;
        const foreignMetrics = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/${foreignTenant}/iam/metrics`, headers,
        });
        const foreignExport = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/${foreignTenant}/iam/audit-export`, headers,
        });
        expect(foreignMetrics.statusCode).toBe(403);
        expect(foreignExport.statusCode).toBe(403);
    });

    it("denies the R7 Provider operational surface without explicit Access authority", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(admin.sessionId);

        const responses = await Promise.all([
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/service", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/release", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/metrics", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/status", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/audit-export", headers }),
        ]);
        for (const response of responses) expect(response.statusCode).toBe(403);
    });
});

type PermissionFixture = readonly [permissionId: string, resource: string, action: string];

async function grant(
    identityId: string,
    membershipId: string,
    tenantId: string,
    permissions: readonly PermissionFixture[],
): Promise<void> {
    const runtime = await getIamIntegrationRuntime();
    const now = new Date().toISOString();
    for (const [permissionId, resource, action] of permissions) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId },
            { $set: {
                permissionId, service: "iam", resource, action,
                displayName: permissionId,
                description: `Allows ${permissionId}.`,
                classification: "administrative",
                createdAt: now,
            } },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId, membershipId, tenantId, permissionId,
            assignmentType: "grant", scope: { scopeType: "tenant" },
            status: "active", assignedBy: "system:r7-release-gate",
            effectiveFrom: now, activatedAt: now, suspensionSources: [],
            createdAt: now, updatedAt: now,
        });
    }
}

function auth(sessionId: string) {
    return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" };
}

function assertSafe(body: string): void {
    const lower = body.toLowerCase();
    for (const forbidden of [
        "passwordhash", "passwordcredentialid", "providersessionid",
        "invitationtokenhash", "betterauthsecret", "mongodb_uri",
        "nats_url", "connectionstring", '"secret"',
    ]) {
        expect(lower).not.toContain(forbidden);
    }
}
