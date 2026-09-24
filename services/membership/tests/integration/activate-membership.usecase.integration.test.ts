// services/membership/tests/integration/activate-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// ACTIVATE MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Activate Membership™ use case", () => {
    it("activates a pending Membership", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipPost(runtime, `/api/v1/membership/${String(membership.membershipId)}/activate`, {}, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.activated" });
    });
});
