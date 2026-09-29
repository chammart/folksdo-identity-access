// tests/e2e/foundation/iam-r4-tenant-activity.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R4 PATCH 1 — TENANT ACTIVITY E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Real IAM HTTP + Engine + MongoDB. No HTTP mocks.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import {
    accessHttp,
    createAccessAdministrativeContext,
} from "../access/support/access-authenticated-fixtures";

describe("IAM R4 Tenant Activity", () => {
    it("returns safe human-oriented IAM activity strictly inside the authorized tenant", async () => {
        const certification = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();
        const permissionId = "iam.activity.list";

        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId },
            {
                $set: {
                    permissionId,
                    service: "iam",
                    resource: "activity",
                    action: "list",
                    displayName: permissionId,
                    description: "Allows tenant IAM activity administration reads.",
                    classification: "administrative",
                    createdAt: now,
                },
            },
            { upsert: true },
        );
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId: certification.identity.userId,
            membershipId: certification.membershipId,
            tenantId: certification.tenantId,
            permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:r4-certification",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });

        const role = await accessHttp(certification.sessionId, "POST", "/roles", {
            key: `r4-activity-${randomUUID()}`,
            name: "R4 Tenant Activity Role",
            description: "Produces canonical tenant activity for R4 certification.",
            type: "tenant",
            tenantId: certification.tenantId,
            permissionIds: [],
        });
        expect(role.statusCode).toBe(201);

        const response = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/tenants/${encodeURIComponent(certification.tenantId)}/iam/activity?capability=access&limit=100`,
            headers: { authorization: `Bearer ${certification.sessionId}` },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            items: expect.arrayContaining([
                expect.objectContaining({
                    eventType: "access.role.created",
                    capability: "access",
                    resource: expect.objectContaining({
                        type: "access.role",
                        id: String(role.json().roleId),
                    }),
                }),
            ]),
            total: expect.any(Number),
            offset: 0,
            limit: 100,
        });
        expect(response.body).not.toContain('"payload"');
        expect(response.body).not.toContain('"metadata"');
        expect(response.body).not.toContain("providerSessionId");
        expect(response.body).not.toContain("passwordHash");
        expect(response.body).not.toContain('"token"');

        const unrelatedTenantId = `tenant_${randomUUID()}`;
        const crossTenant = await runtime.server.app.inject({
            method: "GET",
            url: `/api/v1/tenants/${unrelatedTenantId}/iam/activity`,
            headers: { authorization: `Bearer ${certification.sessionId}` },
        });
        expect(crossTenant.statusCode).toBe(403);
    });
});
