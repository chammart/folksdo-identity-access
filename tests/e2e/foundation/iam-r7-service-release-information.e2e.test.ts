// tests/e2e/foundation/iam-r7-service-release-information.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R7 PATCH 1 — SERVICE, RELEASE & DEPENDENCY INFORMATION
// -----------------------------------------------------------------------------
// Real authenticated HTTP + Access authorization + real runtime readiness.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R7 Service, Release & Dependency Information", () => {
    it("exposes safe Provider-operational service and release information", async () => {
        const admin = await createAccessAdministrativeContext();
        await grant(admin.identity.userId, admin.membershipId, admin.tenantId, [
            { permissionId: "iam.service.view", resource: "service", action: "view" },
            { permissionId: "iam.service.release-view", resource: "service", action: "release-view" },
        ]);
        const runtime = await getIamIntegrationRuntime();

        const service = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/admin/iam/service",
            headers: auth(admin.sessionId),
        });
        expect(service.statusCode).toBe(200);
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

        const release = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/admin/iam/release",
            headers: auth(admin.sessionId),
        });
        expect(release.statusCode).toBe(200);
        expect(release.json()).toMatchObject({
            releaseId: "local",
            version: "development",
            environment: "test",
        });

        const serialized = JSON.stringify({ service: service.json(), release: release.json() });
        for (const secretName of [
            "mongodb", "nats", "uri", "connection", "secret", "password",
            "databaseName", "subjectPrefix", "betterAuthSecret",
        ]) {
            expect(serialized.toLowerCase()).not.toContain(secretName.toLowerCase());
        }
    });

    it("keeps readiness compatible while adding safe operational dependency detail", async () => {
        const runtime = await getIamIntegrationRuntime();
        const response = await runtime.server.app.inject({ method: "GET", url: "/health/ready" });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            status: "ready",
            dependencies: { platformRuntime: true, accessRuntime: true },
            operationalDependencies: {
                platformRuntime: { status: "ready" },
                accessRuntime: { status: "ready" },
            },
        });
    });

    it("denies service information without explicit Provider authority", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const response = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/admin/iam/service",
            headers: auth(admin.sessionId),
        });
        expect(response.statusCode).toBe(403);
    });
});

async function grant(
    identityId: string,
    membershipId: string,
    tenantId: string,
    permissions: readonly { permissionId: string; resource: string; action: string }[],
) {
    const runtime = await getIamIntegrationRuntime();
    const now = new Date().toISOString();
    for (const permission of permissions) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId: permission.permissionId },
            { $set: {
                ...permission,
                service: "iam",
                displayName: permission.permissionId,
                description: `Allows ${permission.permissionId}.`,
                classification: "administrative",
                createdAt: now,
            } },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId, membershipId, tenantId,
            permissionId: permission.permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:r7-service-certification",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });
    }
}
function auth(sessionId: string) {
    return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" };
}
