// tests/e2e/foundation/iam-r4-correlated-investigation-search.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R4 PATCH 3 — CORRELATED INVESTIGATION & UNIFIED SEARCH
// -----------------------------------------------------------------------------
// Real IAM HTTP + Engine + MongoDB. No HTTP mocks.
// -----------------------------------------------------------------------------
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { accessHttp, createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("IAM R4 Correlated Investigation and Unified Search", () => {
    it("finds major IAM resources and investigates their canonical correlated activity safely", async () => {
        const provider = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();

        for (const permission of [
            { permissionId: "iam.investigation.investigate", resource: "investigation", action: "investigate" },
            { permissionId: "iam.search.search", resource: "search", action: "search" },
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
                assignedBy: "system:r4-investigation-certification",
                effectiveFrom: now,
                activatedAt: now,
                suspensionSources: [],
                createdAt: now,
                updatedAt: now,
            });
        }

        const marker = `r4-investigation-${randomUUID()}`;
        const role = await accessHttp(provider.sessionId, "POST", "/roles", {
            key: marker,
            name: `R4 Investigation ${marker}`,
            description: "Canonical activity for correlated investigation certification.",
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

        const search = await get(`/api/v1/admin/iam/search?q=${encodeURIComponent(marker)}&limit=25`);
        expect(search.statusCode).toBe(200);
        expect(search.json()).toMatchObject({
            query: marker,
            items: expect.arrayContaining([
                expect.objectContaining({ type: "role", id: roleId }),
            ]),
        });

        const assignmentSearch = await get(`/api/v1/admin/iam/search?q=${encodeURIComponent(assignmentId)}&limit=25`);
        expect(assignmentSearch.statusCode).toBe(200);
        expect(assignmentSearch.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: "role-assignment", id: assignmentId, membershipId: provider.membershipId }),
        ]));

        const investigation = await get(`/api/v1/admin/iam/investigation?membershipId=${encodeURIComponent(provider.membershipId)}&tenantId=${encodeURIComponent(provider.tenantId)}&limit=200`);
        expect(investigation.statusCode).toBe(200);
        expect(investigation.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                eventType: expect.stringMatching(/^access\./),
                occurredAt: expect.any(String),
                resource: expect.objectContaining({ id: expect.any(String) }),
            }),
        ]));

        for (const response of [search, assignmentSearch, investigation]) {
            expect(response.body).not.toContain('"payload"');
            expect(response.body).not.toContain('"metadata"');
            expect(response.body).not.toContain("providerSessionId");
            expect(response.body).not.toContain("passwordHash");
            expect(response.body).not.toContain('"token"');
            expect(response.body).not.toContain('"secret"');
        }

        const invalid = await get("/api/v1/admin/iam/investigation");
        expect(invalid.statusCode).toBe(400);

        async function get(url: string) {
            return await runtime.server.app.inject({
                method: "GET",
                url,
                headers: { authorization: `Bearer ${provider.sessionId}` },
            });
        }
    });
});
