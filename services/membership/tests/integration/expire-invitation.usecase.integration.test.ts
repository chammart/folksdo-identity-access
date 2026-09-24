// services/membership/tests/integration/expire-invitation.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// EXPIRE INVITATION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Expire Invitation™ use case", () => {
    it("expires an invitation whose lifetime has elapsed", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification);
        const runtime = await getIamIntegrationRuntime();
        await runtime.database.database.collection("membership_invitations").updateOne(
            { invitationId: invitation.invitationId },
            { $set: { expiresAt: "2020-01-01T00:00:00.000Z" } },
        );
        const response = await membershipPost(runtime, `/api/v1/membership/invitations/${String(invitation.invitationId)}/expire`, {}, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "expired", expiredAt: expect.any(String) });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.invitation.expired" });
    });
});
