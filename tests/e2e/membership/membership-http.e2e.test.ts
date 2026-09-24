// tests/e2e/membership/membership-http.e2e.test.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP™ PUBLIC HTTP E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises real registered routes and production IAM runtime dependencies.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { expectIamE2eOutboxCommitted } from "../support/iam-e2e-outbox-assertions";
import {
    createCertifiedInvitation,
    createCertifiedMembership,
    createMembershipCertificationContext,
    expectMembershipStatus,
    membershipGet,
    membershipPost,
} from "../../../services/membership/tests/integration/membership-integration-fixtures";

describe("Membership™ public HTTP behavior", () => {
    it("creates, activates, suspends, reactivates, and archives membership", async () => {
        const certification = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();
        const membership = await createCertifiedMembership(certification);
        const membershipId = String(membership.membershipId);
        expect(membership).toMatchObject({ status: "pending", tenantId: certification.tenantId });

        const activate = await membershipPost(runtime, `/api/v1/membership/${membershipId}/activate`, {}, certification.sessionId);
        expectMembershipStatus(activate, 200);
        expect(activate.json()).toMatchObject({ status: "active" });

        const suspend = await membershipPost(runtime, `/api/v1/membership/${membershipId}/suspend`, { reason: "Security review" }, certification.sessionId);
        expectMembershipStatus(suspend, 200);
        expect(suspend.json()).toMatchObject({ status: "suspended", suspensionReason: "Security review" });

        const reactivate = await membershipPost(runtime, `/api/v1/membership/${membershipId}/reactivate`, {}, certification.sessionId);
        expectMembershipStatus(reactivate, 200);
        expect(reactivate.json()).toMatchObject({ status: "active" });

        const archive = await membershipPost(runtime, `/api/v1/membership/${membershipId}/archive`, { reason: "Participation ended" }, certification.sessionId);
        expectMembershipStatus(archive, 200);
        expect(archive.json()).toMatchObject({ status: "archived", archiveReason: "Participation ended" });
        await expect(runtime.database.database.collection("membership_memberships").findOne({ membershipId }))
            .resolves.toMatchObject({ status: "archived", tenantId: certification.tenantId });
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "membership.membership.archived" });
    });

    it("redeems a real invitation without creating a duplicate membership", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification, certification.identity.email);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipPost(runtime, "/api/v1/membership/invitations/redeem", {
            invitationId: invitation.invitationId,
            identityId: certification.identity.userId,
            identityEmail: invitation.invitedEmail,
        }, certification.sessionId);
        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({
            invitation: { status: "redeemed" },
            membership: { identityId: certification.identity.userId, status: "active" },
        });
        await expect(runtime.database.database.collection("membership_memberships").countDocuments({
            identityId: certification.identity.userId,
            tenantId: certification.tenantId,
        })).resolves.toBe(1);
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "membership.invitation.redeemed" });
    });

    it("resolves the authenticated membership context and rejects missing authentication", async () => {
        const certification = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();
        const current = await membershipGet(runtime, "/api/v1/membership/current", certification.sessionId);
        expectMembershipStatus(current, 200);
        expect(current.json()).toMatchObject({
            identityId: certification.identity.userId,
            activeMembershipId: certification.membershipId,
            activeTenantId: certification.tenantId,
        });
        const unauthenticated = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/membership/current",
        });
        expect(unauthenticated.statusCode).toBe(401);
    });

    it("rejects switching to another identity's membership and preserves the current context", async () => {
        const owner = await createMembershipCertificationContext();
        const other = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();
        const before = await membershipGet(runtime, "/api/v1/membership/current", owner.sessionId);
        expectMembershipStatus(before, 200);
        const attempted = await membershipPost(runtime, "/api/v1/membership/context", {
            membershipId: other.membershipId,
        }, owner.sessionId);
        expect(attempted.statusCode).not.toBe(200);
        const after = await membershipGet(runtime, "/api/v1/membership/current", owner.sessionId);
        expectMembershipStatus(after, 200);
        expect(after.json()).toMatchObject({
            activeMembershipId: owner.membershipId,
            activeTenantId: owner.tenantId,
        });
    });
});
