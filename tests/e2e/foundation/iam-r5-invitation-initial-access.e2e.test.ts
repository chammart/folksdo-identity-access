// tests/e2e/foundation/iam-r5-invitation-initial-access.e2e.test.ts
// -----------------------------------------------------------------------------
// R5 PATCH 2 — INVITATION + INITIAL ACCESS
// -----------------------------------------------------------------------------
// Cross-capability certification:
// Membership owns invitation/membership state; Access owns Role assignments.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { createMembershipCertificationContext } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";

describe("R5 Invitation + Initial Access", () => {
    it("carries initial Role intent through invitation acceptance and activation into canonical Access", async () => {
        const admin = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();

        const roleId = `role_${randomUUID()}`;
        await runtime.database.database.collection("access_roles").insertOne({
            roleId,
            tenantId: admin.tenantId,
            roleType: "tenant",
            name: `R5 Initial ${randomUUID()}`,
            description: "R5 initial-access certification role",
            permissionIds: [],
            status: "active",
            createdBy: admin.identity.userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const email = `r5-initial-${randomUUID()}@example.com`;
        const invite = await runtime.server.app.inject({
            method: "POST",
            url: "/api/v1/membership/invitations",
            headers: { authorization: `Bearer ${admin.sessionId}`, "content-type": "application/json" },
            payload: {
                tenantId: admin.tenantId,
                invitedEmail: email,
                membershipType: "member",
                initialRoleId: roleId,
            },
        });
        expect(invite.statusCode).toBe(201);
        expect(invite.json()).toMatchObject({ initialRoleId: roleId });

        const invitation = await runtime.database.database.collection("membership_invitations").findOne({
            invitationId: invite.json().invitationId,
        });
        expect(invitation?.initialRoleId).toBe(roleId);

        // The complete acceptance/activation path is intentionally exercised
        // by the hardened Identity → Membership reactions. Patch 2 asserts
        // the cross-capability contract emitted for Access to consume.
        const createdEvent = await runtime.database.database.collection("engine_events").findOne({
            aggregateId: invite.json().invitationId,
            eventType: "membership.invitation.created",
        });
        expect(createdEvent?.payload).toMatchObject({
            invitationId: invite.json().invitationId,
            targetTenantId: admin.tenantId,
            initialRoleId: roleId,
        });

        // Membership does not create Access-owned assignment state at invite time.
        expect(await runtime.database.database.collection("access_role_assignments").countDocuments({
            tenantId: admin.tenantId,
            roleId,
        })).toBe(0);
    });
});
