// services/membership/tests/integration/invite-member.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// INVITE MEMBER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext } from "./membership-integration-fixtures";

describe("Invite Member™ use case", () => {
    it("returns the token once and persists only its hash", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification);
        const runtime = await getIamIntegrationRuntime();
        const persisted = await runtime.database.database.collection("membership_invitations").findOne({ invitationId: invitation.invitationId });

        expect(invitation.invitationToken).toEqual(expect.any(String));
        expect(persisted).toMatchObject({ status: "pending", invitationTokenHash: expect.any(String) });
        expect(persisted).not.toHaveProperty("invitationToken");
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.invitation.created" });
    });
});
