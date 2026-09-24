// services/membership/tests/integration/revoke-invitation.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// REVOKE INVITATION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Revoke Invitation™ use case", () => {
    it("revokes a pending invitation", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipPost(runtime, `/api/v1/membership/invitations/${String(invitation.invitationId)}/revoke`, {}, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "revoked", revokedAt: expect.any(String) });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.invitation.revoked" });
    });
});
