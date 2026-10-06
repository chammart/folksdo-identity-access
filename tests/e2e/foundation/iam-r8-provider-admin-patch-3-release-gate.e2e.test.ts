// tests/e2e/foundation/iam-r8-provider-admin-patch-3-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// R8 PATCH 3 — PROVIDER ADMIN SECURITY / INVESTIGATION / ACTIVITY RELEASE GATE
// -----------------------------------------------------------------------------
// Certifies the real IAM HTTP contracts consumed by Provider Admin Patch 3.
// No HTTP mocks. IAM remains authoritative for security and investigation data.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import {
    createActiveIdentity,
    grantProviderIdentitySecurityAdministration,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("R8 Patch 3 — Provider Admin release gate", () => {
    it("serves safe IAM-owned Security, Search, Activity and Correlation contracts to an authorized Provider", async () => {
        const provider = await createAccessAdministrativeContext();
        await grantProviderIdentitySecurityAdministration(provider.identity);
        await grantIamAdministrationPermissions(provider.identity.userId, provider.membershipId, provider.tenantId);

        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(provider.sessionId);

        const summary = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/identities/${encodeURIComponent(target.userId)}/security-summary`,
            headers,
        });
        expect(summary.statusCode).toBe(200);
        expect(summary.json()).toMatchObject({
            userId: target.userId,
            identityStatus: "active",
            verification: { emailVerified: true },
            authentication: { signInEligible: true },
            sessions: { active: expect.any(Number) },
        });
        assertSafe(summary.body);

        const sessions = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/identities/${encodeURIComponent(target.userId)}/sessions`,
            headers,
        });
        expect(sessions.statusCode).toBe(200);
        expect(sessions.json()).toMatchObject({ items: expect.any(Array) });
        assertSafe(sessions.body);

        const history = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/identities/${encodeURIComponent(target.userId)}/security-history`,
            headers,
        });
        expect(history.statusCode).toBe(200);
        expect(history.json()).toMatchObject({
            userId: target.userId,
            events: expect.any(Array),
        });
        assertSafe(history.body);

        const search = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/admin/iam/search?q=${encodeURIComponent(target.email)}&limit=50`,
            headers,
        });
        expect(search.statusCode).toBe(200);
        expect(search.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: "identity", id: target.userId }),
        ]));
        assertSafe(search.body);

        const activity = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/admin/iam/activity?capability=identity&limit=100",
            headers,
        });
        expect(activity.statusCode).toBe(200);
        expect(activity.json()).toMatchObject({ scope: "provider", items: expect.any(Array) });
        const targetEvent = (activity.json().items as Array<Record<string, unknown>>).find((item) =>
            typeof item.correlationId === "string" &&
            typeof item.eventType === "string" &&
            String(item.eventType).startsWith("identity."),
        );
        expect(targetEvent).toBeDefined();
        assertSafe(activity.body);

        const correlationId = String(targetEvent?.correlationId);
        const investigation = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/admin/iam/investigation?correlationId=${encodeURIComponent(correlationId)}&limit=200`,
            headers,
        });
        expect(investigation.statusCode).toBe(200);
        expect(investigation.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ correlationId }),
        ]));
        assertSafe(investigation.body);
    });

    it("denies Patch 3 Provider administration reads without explicit Access authority", async () => {
        const provider = await createAccessAdministrativeContext();
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();
        const headers = auth(provider.sessionId);

        const responses = await Promise.all([
            runtime.server.app.inject({ method: "GET", url: `/api/v1/identities/${target.userId}/security-summary`, headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/activity", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/search?q=identity", headers }),
            runtime.server.app.inject({ method: "GET", url: "/api/v1/admin/iam/investigation?actorId=actor", headers }),
        ]);

        for (const response of responses) expect(response.statusCode).toBe(403);
    });
});

async function grantIamAdministrationPermissions(identityId: string, membershipId: string, tenantId: string): Promise<void> {
    const runtime = await getIamIntegrationRuntime();
    const now = new Date().toISOString();
    const permissions = [
        ["iam.activity.provider-list", "activity", "provider-list"],
        ["iam.timeline.timeline-view", "timeline", "timeline-view"],
        ["iam.investigation.investigate", "investigation", "investigate"],
        ["iam.search.search", "search", "search"],
    ] as const;

    for (const [permissionId, resource, action] of permissions) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId },
            { $set: { permissionId, service: "iam", resource, action, displayName: permissionId, description: `Allows ${permissionId}.`, classification: "administrative", createdAt: now } },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId,
            membershipId,
            tenantId,
            permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:r8-provider-admin-patch-3-release-gate",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });
    }
}

function auth(sessionId: string) {
    return { authorization: `Bearer ${sessionId}` };
}

function assertSafe(body: string): void {
    const lower = body.toLowerCase();
    for (const forbidden of [
        "providersessionid",
        "passwordhash",
        "passwordcredentialid",
        "passwordresetrequestid",
        '"token"',
        '"secret"',
        '"payload"',
        '"metadata"',
    ]) {
        expect(lower).not.toContain(forbidden);
    }
}
