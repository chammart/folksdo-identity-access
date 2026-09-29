// tests/e2e/foundation/iam-r4-activity-investigation-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// R4 RELEASE GATE — IAM ACTIVITY & INVESTIGATION
// -----------------------------------------------------------------------------
// Certifies human-oriented administration intelligence across canonical
// Identity → Membership → Access activity using real HTTP + Engine + MongoDB.
// No HTTP mocks and no duplicate event store.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { createCertifiedInvitation, createCertifiedMembership } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { accessHttp, createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("R4 IAM Activity & Investigation release gate", () => {
    it("answers what happened, who, when, where, and as part of which operation", async () => {
        const provider = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();

        await grant("iam.activity.list", "activity", "list");
        await grant("iam.activity.provider-list", "activity", "provider-list");
        await grant("iam.timeline.timeline-view", "timeline", "timeline-view");
        await grant("iam.investigation.investigate", "investigation", "investigate");
        await grant("iam.search.search", "search", "search");

        const membership = await createCertifiedMembership(provider, true);
        const membershipId = String(membership.membershipId);
        const invitation = await createCertifiedInvitation(provider);
        const invitationId = String(invitation.invitationId);

        const role = await accessHttp(provider.sessionId, "POST", "/roles", {
            key: `r4-gate-${randomUUID()}`,
            name: "R4 Release Gate Role",
            description: "Cross-capability R4 activity certification.",
            type: "tenant",
            tenantId: provider.tenantId,
            permissionIds: [],
        });
        expect(role.statusCode).toBe(201);
        const roleId = String(role.json().roleId);

        const assignment = await accessHttp(provider.sessionId, "POST", "/role-assignments", {
            roleId,
            subjectType: "membership",
            subjectId: provider.membershipId,
            identityId: provider.identity.userId,
            membershipId: provider.membershipId,
            tenantId: provider.tenantId,
        });
        expect(assignment.statusCode).toBe(201);
        const assignmentId = String(assignment.json().assignmentId);

        // Tenant activity: WHERE is fixed by authenticated Membership before event access.
        const tenantActivity = await get(`/api/v1/tenants/${encodeURIComponent(provider.tenantId)}/iam/activity?limit=100`);
        expect(tenantActivity.statusCode).toBe(200);
        expect(tenantActivity.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ eventType: expect.stringMatching(/^membership\./), occurredAt: expect.any(String) }),
            expect.objectContaining({ eventType: "access.role.created", resource: { type: "access.role", id: roleId } }),
        ]));

        const forbiddenTenant = await get(`/api/v1/tenants/tenant_${randomUUID()}/iam/activity`);
        expect(forbiddenTenant.statusCode).toBe(403);

        // Provider activity: explicitly authorized and able to inspect tenant activity.
        const providerActivity = await get(`/api/v1/admin/iam/activity?tenantId=${encodeURIComponent(provider.tenantId)}&limit=100`);
        expect(providerActivity.statusCode).toBe(200);
        expect(providerActivity.json()).toMatchObject({ scope: "provider", items: expect.any(Array) });

        // All five R4 lifecycle timeline contracts.
        for (const [type, id] of [
            ["identity", provider.identity.userId],
            ["membership", membershipId],
            ["invitation", invitationId],
            ["role", roleId],
            ["assignment", assignmentId],
        ] as const) {
            const timeline = await get(`/api/v1/admin/iam/timelines/${type}/${encodeURIComponent(id)}`);
            expect(timeline.statusCode).toBe(200);
            expect(timeline.json()).toMatchObject({
                resource: { type, id },
                items: expect.arrayContaining([
                    expect.objectContaining({
                        eventType: expect.any(String),
                        occurredAt: expect.any(String),
                        resource: expect.objectContaining({ id }),
                    }),
                ]),
            });
            assertSafe(timeline.body);
        }

        // Start with a concrete resource, then recover correlation/request context
        // from its canonical event and investigate the operation.
        const roleTimeline = await get(`/api/v1/admin/iam/timelines/role/${encodeURIComponent(roleId)}`);
        const roleCreated = roleTimeline.json().items.find((item: { eventType: string }) => item.eventType === "access.role.created");
        expect(roleCreated).toBeDefined();
        expect(roleCreated.actorId).toBe(provider.identity.userId);
        expect(roleCreated.tenantId).toBe(provider.tenantId);
        expect(roleCreated.requestId).toEqual(expect.any(String));
        expect(roleCreated.correlationId).toEqual(expect.any(String));

        const correlated = await get(`/api/v1/admin/iam/investigation?correlationId=${encodeURIComponent(roleCreated.correlationId)}&limit=200`);
        expect(correlated.statusCode).toBe(200);
        expect(correlated.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                eventType: "access.role.created",
                actorId: provider.identity.userId,
                tenantId: provider.tenantId,
                requestId: roleCreated.requestId,
                correlationId: roleCreated.correlationId,
                resource: { type: "access.role", id: roleId },
            }),
        ]));

        for (const [key, value] of [
            ["requestId", roleCreated.requestId],
            ["actorId", provider.identity.userId],
            ["tenantId", provider.tenantId],
            ["identityId", provider.identity.userId],
            ["membershipId", membershipId],
            ["invitationId", invitationId],
        ] as const) {
            const investigation = await get(`/api/v1/admin/iam/investigation?${key}=${encodeURIComponent(value)}&limit=200`);
            expect(investigation.statusCode).toBe(200);
            expect(investigation.json().items.length).toBeGreaterThan(0);
            assertSafe(investigation.body);
        }

        // Unified search discovers major IAM resources without exposing state internals.
        for (const [query, type, id] of [
            [provider.identity.email, "identity", provider.identity.userId],
            [membershipId, "membership", membershipId],
            [invitationId, "invitation", invitationId],
            [roleId, "role", roleId],
            [assignmentId, "role-assignment", assignmentId],
        ] as const) {
            const search = await get(`/api/v1/admin/iam/search?q=${encodeURIComponent(query)}&limit=50`);
            expect(search.statusCode).toBe(200);
            expect(search.json().items).toEqual(expect.arrayContaining([
                expect.objectContaining({ type, id }),
            ]));
            assertSafe(search.body);
        }

        assertSafe(tenantActivity.body);
        assertSafe(providerActivity.body);
        assertSafe(correlated.body);

        async function grant(permissionId: string, resource: string, action: string) {
            await runtime.database.database.collection("access_permissions").updateOne(
                { permissionId },
                { $set: { permissionId, service: "iam", resource, action, displayName: permissionId, description: `Allows ${permissionId}.`, classification: "administrative", createdAt: now } },
                { upsert: true },
            );
            await runtime.database.database.collection("access_permission_assignments").insertOne({
                assignmentId: `assignment_${randomUUID()}`,
                identityId: provider.identity.userId,
                membershipId: provider.membershipId,
                tenantId: provider.tenantId,
                permissionId,
                assignmentType: "grant",
                scope: { scopeType: "tenant" },
                status: "active",
                assignedBy: "system:r4-release-gate",
                effectiveFrom: now,
                activatedAt: now,
                suspensionSources: [],
                createdAt: now,
                updatedAt: now,
            });
        }

        async function get(url: string) {
            return await runtime.server.app.inject({
                method: "GET",
                url,
                headers: { authorization: `Bearer ${provider.sessionId}` },
            });
        }
    });
});

function assertSafe(body: string): void {
    expect(body).not.toContain('"payload"');
    expect(body).not.toContain('"metadata"');
    expect(body).not.toContain("providerSessionId");
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("passwordCredentialId");
    expect(body).not.toContain('"token"');
    expect(body).not.toContain('"secret"');
}
