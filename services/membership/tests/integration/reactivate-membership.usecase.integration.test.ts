// services/membership/tests/integration/reactivate-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// REACTIVATE MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Reactivate Membership™ use case", () => {
    it("reactivates a manually suspended Membership", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification, true);
        const runtime = await getIamIntegrationRuntime();
        const membershipId = String(membership.membershipId);
        expectMembershipStatus(await membershipPost(runtime, `/api/v1/membership/${membershipId}/suspend`, { reason: "Review" }, certification.sessionId), 200);

        const response = await membershipPost(runtime, `/api/v1/membership/${membershipId}/reactivate`, {}, certification.sessionId);
        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.reactivated" });
    });
});
