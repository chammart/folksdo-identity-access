// tests/e2e/foundation/iam-r6-access-reviews.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R6 PATCH 3 — ACCESS REVIEWS & PRIVILEGED ACCESS REVIEWS
// -----------------------------------------------------------------------------
// Real HTTP + Access authorization + Engine + MongoDB + outbox. No HTTP mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { accessHttp, createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R6 Access Reviews", () => {
    it("creates, decides, revokes and completes an Access review with history", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();

        const role = await accessHttp(admin.sessionId, "POST", "/roles", {
            key: `r6-review-${randomUUID()}`, name: "R6 Review Role",
            description: "Role used for R6 Access review certification.", type: "tenant",
            tenantId: admin.tenantId, permissionIds: [],
        });
        expect(role.statusCode).toBe(201);
        const assigned = await accessHttp(admin.sessionId, "POST", "/role-assignments", {
            roleId: role.json().roleId, subjectType: "membership", subjectId: admin.membershipId,
            identityId: admin.identity.userId, membershipId: admin.membershipId, tenantId: admin.tenantId,
        });
        expect(assigned.statusCode).toBe(201);

        const created = await review(admin.sessionId, "POST", "/reviews", { name: "Quarterly Access Review", kind: "access" });
        expect(created.statusCode).toBe(201);
        const body = created.json();
        const item = body.items.find((candidate: { assignmentId: string }) => candidate.assignmentId === assigned.json().assignmentId);
        expect(item).toBeDefined();

        // Confirm every other snapshotted item, revoke the target, then complete.
        for (const candidate of body.items as { itemId: string; assignmentId: string }[]) {
            const decision = candidate.assignmentId === assigned.json().assignmentId ? "revoke" : "confirm";
            const decided = await review(admin.sessionId, "POST", `/reviews/${body.reviewId}/items/${candidate.itemId}/decision`, {
                decision, reason: decision === "revoke" ? "Access no longer required" : "Access remains appropriate",
            });
            expect(decided.statusCode).toBe(200);
        }
        const completed = await review(admin.sessionId, "POST", `/reviews/${body.reviewId}/complete`, {});
        expect(completed.statusCode).toBe(200);
        expect(completed.json()).toMatchObject({ status: "completed", completedAt: expect.any(String) });
        expect(completed.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ assignmentId: assigned.json().assignmentId, decision: "revoke", decidedBy: admin.identity.userId, reason: "Access no longer required" }),
        ]));

        const canonicalAssignment = await runtime.database.database.collection("access_role_assignments").findOne({ assignmentId: assigned.json().assignmentId });
        expect(canonicalAssignment).toMatchObject({ status: "removed" });
        const canonicalReview = await runtime.database.database.collection("access_reviews").findOne({ reviewId: body.reviewId });
        expect(canonicalReview).toMatchObject({ status: "completed" });
        expect(await runtime.database.findEvents({ aggregateType: "access.review", aggregateId: body.reviewId })).toHaveLength(body.items.length + 2);
        expect((await runtime.database.findOutboxRecords({ subject: "access.review.completed" })).length).toBeGreaterThanOrEqual(1);
    });

    it("scopes privileged reviews using existing Access privilege classification", async () => {
        const admin = await createAccessAdministrativeContext();
        const privileged = await review(admin.sessionId, "POST", "/reviews", { name: "Privileged Access Review", kind: "privileged" });
        expect(privileged.statusCode).toBe(201);
        expect(privileged.json()).toMatchObject({ kind: "privileged", status: "open" });
        for (const item of privileged.json().items as { privileged: boolean }[]) expect(item.privileged).toBe(true);
        expect((privileged.json().items as unknown[]).length).toBeGreaterThan(0);
    });
});

async function review(sessionId: string, method: "GET" | "POST", path: string, payload?: Record<string, unknown>) {
    const runtime = await getIamIntegrationRuntime();
    return await runtime.server.app.inject({
        method, url: `/api/v1/access${path}`,
        headers: { authorization: `Bearer ${sessionId}`, "content-type": "application/json" },
        ...(payload === undefined ? {} : { payload }),
    });
}
