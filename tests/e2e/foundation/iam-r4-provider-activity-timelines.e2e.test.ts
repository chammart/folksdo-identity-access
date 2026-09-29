// tests/e2e/foundation/iam-r4-provider-activity-timelines.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R4 PATCH 2 — PROVIDER ACTIVITY & LIFECYCLE TIMELINES
// -----------------------------------------------------------------------------
// Real IAM HTTP + Engine + MongoDB. No HTTP mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { accessHttp, createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R4 Provider Activity and Lifecycle Timelines", () => {
    it("provides authorized cross-tenant activity and safe chronological resource timelines", async () => {
        const provider = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();

        for (const permission of [
            { permissionId: "iam.activity.provider-list", resource: "activity", action: "provider-list" },
            { permissionId: "iam.timeline.timeline-view", resource: "timeline", action: "timeline-view" },
        ]) {
            await runtime.database.database.collection("access_permissions").updateOne(
                { permissionId: permission.permissionId },
                { $set: { ...permission, service: "iam", displayName: permission.permissionId, description: `Allows ${permission.permissionId}.`, classification: "administrative", createdAt: now } },
                { upsert: true },
            );
            await runtime.database.database.collection("access_permission_assignments").insertOne({
                assignmentId: `assignment_${randomUUID()}`,
                identityId: provider.identity.userId,
                membershipId: provider.membershipId,
                tenantId: provider.tenantId,
                permissionId: permission.permissionId,
                assignmentType: "grant",
                scope: { scopeType: "tenant" },
                status: "active",
                assignedBy: "system:r4-provider-certification",
                effectiveFrom: now,
                activatedAt: now,
                suspensionSources: [],
                createdAt: now,
                updatedAt: now,
            });
        }

        const role = await accessHttp(provider.sessionId, "POST", "/roles", {
            key: `r4-provider-${randomUUID()}`,
            name: "R4 Provider Timeline Role",
            description: "Produces canonical role and assignment lifecycle activity.",
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

        const activity = await get(`/api/v1/admin/iam/activity?tenantId=${encodeURIComponent(provider.tenantId)}&capability=access&limit=100`);
        expect(activity.statusCode).toBe(200);
        expect(activity.json()).toMatchObject({
            scope: "provider",
            items: expect.arrayContaining([
                expect.objectContaining({ eventType: "access.role.created", resource: { type: "access.role", id: roleId } }),
            ]),
        });

        const roleTimeline = await get(`/api/v1/admin/iam/timelines/role/${encodeURIComponent(roleId)}`);
        expect(roleTimeline.statusCode).toBe(200);
        expect(roleTimeline.json()).toMatchObject({
            resource: { type: "role", id: roleId },
            items: expect.arrayContaining([expect.objectContaining({ eventType: "access.role.created" })]),
        });

        const assignmentTimeline = await get(`/api/v1/admin/iam/timelines/assignment/${encodeURIComponent(assignmentId)}`);
        expect(assignmentTimeline.statusCode).toBe(200);
        expect(assignmentTimeline.json().items).toEqual(
            expect.arrayContaining([expect.objectContaining({ eventType: expect.stringMatching(/^access\./) })]),
        );

        for (const response of [activity, roleTimeline, assignmentTimeline]) {
            expect(response.body).not.toContain('"payload"');
            expect(response.body).not.toContain('"metadata"');
            expect(response.body).not.toContain("providerSessionId");
            expect(response.body).not.toContain("passwordHash");
            expect(response.body).not.toContain('"token"');
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
