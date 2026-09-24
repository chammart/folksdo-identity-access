// services/membership/tests/integration/redeem-invitation.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// REDEEM INVITATION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Redeem Invitation™ use case", () => {
    it("redeems the invitation and reuses the eligible Membership atomically", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(
            certification,
            certification.identity.email,
        );
        const runtime = await getIamIntegrationRuntime();
        const identityId = certification.identity.userId;
        const response = await membershipPost(runtime, "/api/v1/membership/invitations/redeem", {
            invitationId: invitation.invitationId,
            identityId,
            identityEmail: invitation.invitedEmail,
        }, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ invitation: { status: "redeemed" }, membership: { identityId, status: "active" } });
        await expect(
            runtime.database.database.collection("membership_memberships").countDocuments({
                identityId,
                tenantId: certification.tenantId,
            }),
        ).resolves.toBe(1);
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.invitation.redeemed" });
    });
});
