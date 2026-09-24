// services/membership/tests/integration/suspend-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// SUSPEND MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Suspend Membership™ use case", () => {
    it("suspends an active Membership with its business reason", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification, true);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipPost(runtime, `/api/v1/membership/${String(membership.membershipId)}/suspend`, { reason: "Security review" }, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "suspended", suspensionReason: "Security review" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.suspended" });
    });
});
