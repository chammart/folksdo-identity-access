// services/membership/tests/integration/get-invitation.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// GET INVITATION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("Get Invitation™ use case", () => {
    it("returns an invitation without its token hash", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, `/api/v1/membership/invitations/${String(invitation.invitationId)}`, certification.sessionId);

        expectMembershipStatus(response, 200);
        const body = response.json<Record<string, unknown>>();
        expect(body).toMatchObject({ invitationId: invitation.invitationId, status: "pending" });
        expect(body).not.toHaveProperty("invitationTokenHash");
        expect(body).not.toHaveProperty("invitationToken");
    });
});
