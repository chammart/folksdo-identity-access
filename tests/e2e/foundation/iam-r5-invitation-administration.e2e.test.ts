// tests/e2e/foundation/iam-r5-invitation-administration.e2e.test.ts
// -----------------------------------------------------------------------------
// R5 PATCH 1 — INVITATION ADMINISTRATION
// -----------------------------------------------------------------------------
// Real Membership HTTP + Access authorization + Engine + MongoDB + outbox.
// No HTTP mocks.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { createMembershipCertificationContext } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";

describe("R5 Invitation Administration", () => {
    it("reissues idempotently and bulk-invites with deterministic per-item outcomes and tenant isolation", async () => {
        const admin = await createMembershipCertificationContext();
        const otherTenantAdmin = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();

        const email = `r5-reissue-${randomUUID()}@example.com`;
        const created = await post(admin.sessionId, "/api/v1/membership/invitations", {
            tenantId: admin.tenantId,
            invitedEmail: email,
            membershipType: "member",
        });
        expect(created.statusCode).toBe(201);
        const original = created.json();
        expect(original.invitationToken).toEqual(expect.any(String));

        const before = await runtime.database.database.collection("membership_invitations").findOne({
            invitationId: original.invitationId,
        });
        expect(before?.invitationTokenHash).toEqual(expect.any(String));

        const idempotencyKey = `reissue_${randomUUID()}`;
        const reissued = await post(
            admin.sessionId,
            `/api/v1/membership/invitations/${original.invitationId}/reissue`,
            { idempotencyKey },
        );
        expect(reissued.statusCode).toBe(200);
        expect(reissued.json()).toMatchObject({
            invitationId: original.invitationId,
            reissued: true,
            invitationToken: expect.any(String),
        });
        expect(reissued.json().invitationToken).not.toBe(original.invitationToken);

        const after = await runtime.database.database.collection("membership_invitations").findOne({
            invitationId: original.invitationId,
        });
        expect(after?.invitationTokenHash).not.toBe(before?.invitationTokenHash);
        expect(after?.lastReissueIdempotencyKey).toBe(idempotencyKey);

        const eventCountAfterFirst = await runtime.database.database.collection("engine_events").countDocuments({
            aggregateId: original.invitationId,
            eventType: "membership.invitation.reissued",
        });
        const outboxCountAfterFirst = await runtime.database.database.collection("engine_outbox").countDocuments({
            subject: "membership.invitation.reissued",
            "payload.invitationId": original.invitationId,
        });

        const retry = await post(
            admin.sessionId,
            `/api/v1/membership/invitations/${original.invitationId}/reissue`,
            { idempotencyKey },
        );
        expect(retry.statusCode).toBe(200);
        expect(retry.json()).toMatchObject({
            invitationId: original.invitationId,
            reissued: false,
        });
        expect(retry.json().invitationToken).toBeUndefined();

        expect(await runtime.database.database.collection("engine_events").countDocuments({
            aggregateId: original.invitationId,
            eventType: "membership.invitation.reissued",
        })).toBe(eventCountAfterFirst);
        expect(await runtime.database.database.collection("engine_outbox").countDocuments({
            subject: "membership.invitation.reissued",
            "payload.invitationId": original.invitationId,
        })).toBe(outboxCountAfterFirst);

        const crossTenant = await post(
            otherTenantAdmin.sessionId,
            `/api/v1/membership/invitations/${original.invitationId}/reissue`,
            { idempotencyKey: `cross_${randomUUID()}` },
        );
        expect(crossTenant.statusCode).toBe(403);

        const firstBulkEmail = `r5-bulk-a-${randomUUID()}@example.com`;
        const secondBulkEmail = `r5-bulk-b-${randomUUID()}@example.com`;
        const bulk = await post(admin.sessionId, "/api/v1/membership/invitations/bulk", {
            tenantId: admin.tenantId,
            items: [
                { invitedEmail: firstBulkEmail, membershipType: "member" },
                { invitedEmail: secondBulkEmail, membershipType: "guest" },
                { invitedEmail: firstBulkEmail, membershipType: "member" },
            ],
        });
        expect(bulk.statusCode).toBe(200);
        expect(bulk.json()).toMatchObject({
            tenantId: admin.tenantId,
            items: [
                { index: 0, invitedEmail: firstBulkEmail, outcome: "created" },
                { index: 1, invitedEmail: secondBulkEmail, outcome: "created" },
                { index: 2, invitedEmail: firstBulkEmail, outcome: "existing" },
            ],
        });
        expect(bulk.json().items[0].invitation.invitationToken).toEqual(expect.any(String));
        expect(bulk.json().items[2].invitation.invitationToken).toBeUndefined();

        expect(await runtime.database.database.collection("membership_invitations").countDocuments({
            targetTenantId: admin.tenantId,
            invitedEmail: firstBulkEmail,
            status: "pending",
        })).toBe(1);

        for (const body of [reissued.body, retry.body, bulk.body]) {
            expect(body).not.toContain("invitationTokenHash");
            expect(body).not.toContain("password");
            expect(body).not.toContain('"secret"');
        }

        async function post(sessionId: string, url: string, payload: Record<string, unknown>) {
            return runtime.server.app.inject({
                method: "POST",
                url,
                headers: {
                    authorization: `Bearer ${sessionId}`,
                    "content-type": "application/json",
                },
                payload,
            });
        }
    });
});
