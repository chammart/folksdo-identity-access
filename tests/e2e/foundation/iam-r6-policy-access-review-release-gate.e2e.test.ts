// tests/e2e/foundation/iam-r6-policy-access-review-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R6 RELEASE GATE — POLICY & ACCESS REVIEWS
// -----------------------------------------------------------------------------
// Real HTTP + Identity + Membership + Access + Engine + MongoDB + NATS outbox.
// Proves Provider → Tenant policy boundaries and governed Membership runtime
// behavior together with the canonical Access review lifecycle. No HTTP mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { accessHttp, createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R6 Policy & Access Review release gate", () => {
    it("enforces effective invitation policy and completes an auditable Access review", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        await grantIam(admin.identity.userId, admin.membershipId, admin.tenantId);

        const provider = await runtime.server.app.inject({
            method: "PUT", url: "/api/v1/admin/iam/policy", headers: auth(admin.sessionId),
            payload: {
                authentication: { passwordSignInEnabled: true },
                sessions: { maxActiveSessions: 10, sessionLifetimeMinutes: 720 },
                verification: { emailVerificationRequired: true },
                invitations: { defaultExpiryHours: 72, maxExpiryHours: 168 },
                recovery: { passwordRecoveryEnabled: true, recoveryRequestExpiryMinutes: 30 },
                security: { suspendRevokesSessions: true },
                tenantDelegation: { invitations: { defaultExpiryHours: { min: 24, max: 120 } } },
            },
        });
        expect(provider.statusCode).toBe(200);

        const tenant = await runtime.server.app.inject({
            method: "PUT", url: `/api/v1/tenants/${admin.tenantId}/iam/settings`, headers: auth(admin.sessionId),
            payload: { invitations: { defaultExpiryHours: 48 } },
        });
        expect(tenant.statusCode).toBe(200);

        const beforeInvite = Date.now();
        const invite = await runtime.server.app.inject({
            method: "POST", url: "/api/v1/membership/invitations", headers: auth(admin.sessionId),
            payload: { tenantId: admin.tenantId, invitedEmail: `r6-gate-${randomUUID()}@example.com`, membershipType: "member" },
        });
        expect(invite.statusCode).toBe(201);
        const ttl = Date.parse(invite.json().expiresAt) - beforeInvite;
        expect(ttl).toBeGreaterThanOrEqual(48 * 60 * 60 * 1000 - 5_000);
        expect(ttl).toBeLessThanOrEqual(48 * 60 * 60 * 1000 + 5_000);

        // Provider narrowing invalidates the stored Tenant override immediately;
        // effective/runtime policy falls back to the Provider default, never widens.
        const narrowed = await runtime.server.app.inject({
            method: "PUT", url: "/api/v1/admin/iam/policy", headers: auth(admin.sessionId),
            payload: {
                authentication: { passwordSignInEnabled: true },
                sessions: { maxActiveSessions: 10, sessionLifetimeMinutes: 720 },
                verification: { emailVerificationRequired: true },
                invitations: { defaultExpiryHours: 24, maxExpiryHours: 72 },
                recovery: { passwordRecoveryEnabled: true, recoveryRequestExpiryMinutes: 30 },
                security: { suspendRevokesSessions: true },
                tenantDelegation: { invitations: { defaultExpiryHours: { min: 12, max: 36 } } },
            },
        });
        expect(narrowed.statusCode).toBe(200);
        const effective = await runtime.server.app.inject({
            method: "GET", url: `/api/v1/tenants/${admin.tenantId}/iam/effective-policy`, headers: auth(admin.sessionId),
        });
        expect(effective.statusCode).toBe(200);
        expect(effective.json().invitations.defaultExpiryHours).toBe(24);

        const role = await accessHttp(admin.sessionId, "POST", "/roles", {
            key: `r6-gate-${randomUUID()}`, name: "R6 Release Gate Role",
            description: "Role used for R6 release-gate review certification.", type: "tenant",
            tenantId: admin.tenantId, permissionIds: [],
        });
        expect(role.statusCode).toBe(201);
        const assigned = await accessHttp(admin.sessionId, "POST", "/role-assignments", {
            roleId: role.json().roleId, subjectType: "membership", subjectId: admin.membershipId,
            identityId: admin.identity.userId, membershipId: admin.membershipId, tenantId: admin.tenantId,
        });
        expect(assigned.statusCode).toBe(201);

        const created = await review(admin.sessionId, "/reviews", { name: "R6 Release Gate Review", kind: "access" });
        expect(created.statusCode).toBe(201);
        const reviewBody = created.json();
        const target = reviewBody.items.find((item: { assignmentId: string }) => item.assignmentId === assigned.json().assignmentId);
        expect(target).toBeDefined();
        for (const item of reviewBody.items as { itemId: string; assignmentId: string }[]) {
            const decision = item.assignmentId === assigned.json().assignmentId ? "revoke" : "confirm";
            const reason = decision === "revoke" ? "R6 obsolete access" : "R6 confirmed access";
            const decided = await review(admin.sessionId, `/reviews/${reviewBody.reviewId}/items/${item.itemId}/decision`, { decision, reason });
            expect(decided.statusCode).toBe(200);
            if (item.itemId === target.itemId) {
                const retry = await review(admin.sessionId, `/reviews/${reviewBody.reviewId}/items/${item.itemId}/decision`, { decision, reason });
                expect(retry.statusCode).toBe(200);
            }
        }
        const completed = await review(admin.sessionId, `/reviews/${reviewBody.reviewId}/complete`, {});
        expect(completed.statusCode).toBe(200);
        expect(completed.json()).toMatchObject({ status: "completed", completedAt: expect.any(String) });
        expect(completed.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ assignmentId: assigned.json().assignmentId, decision: "revoke", decidedBy: admin.identity.userId, reason: "R6 obsolete access" }),
        ]));

        const events = await runtime.database.findEvents({ aggregateType: "access.review", aggregateId: reviewBody.reviewId });
        expect(events.map(event => event.version)).toEqual(events.map((_event, index) => index + 1));
        expect(events[events.length - 1]?.metadata).toMatchObject({ actorId: admin.identity.userId, tenantId: admin.tenantId });
        expect(await runtime.database.findOutboxRecords({ subject: "access.review.completed" })).toEqual(expect.arrayContaining([
            expect.objectContaining({ payload: expect.objectContaining({ reviewId: reviewBody.reviewId }) }),
        ]));
    });
});

async function grantIam(identityId: string, membershipId: string, tenantId: string) {
    const runtime = await getIamIntegrationRuntime(); const now = new Date().toISOString();
    for (const permission of [
        { permissionId: "iam.policy.update", resource: "policy", action: "update" },
        { permissionId: "iam.tenant-policy.view", resource: "tenant-policy", action: "view" },
        { permissionId: "iam.tenant-policy.update", resource: "tenant-policy", action: "update" },
    ]) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId: permission.permissionId },
            { $set: { ...permission, service: "iam", displayName: permission.permissionId, description: `Allows ${permission.permissionId}.`, classification: "administrative", createdAt: now } },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`, identityId, membershipId, tenantId,
            permissionId: permission.permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active",
            assignedBy: "system:r6-release-gate", effectiveFrom: now, activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now,
        });
    }
}
async function review(sessionId: string, path: string, payload: Record<string, unknown>) {
    const runtime = await getIamIntegrationRuntime();
    return await runtime.server.app.inject({ method: "POST", url: `/api/v1/access${path}`, headers: auth(sessionId), payload });
}
function auth(sessionId: string) { return { authorization: `Bearer ${sessionId}`, "content-type": "application/json" }; }
