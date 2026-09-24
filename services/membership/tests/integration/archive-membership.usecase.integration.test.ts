// services/membership/tests/integration/archive-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// ARCHIVE MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Archive Membership™ use case", () => {
    it("archives Membership state irreversibly", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification, true);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipPost(runtime, `/api/v1/membership/${String(membership.membershipId)}/archive`, { reason: "Participation ended" }, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ status: "archived", archiveReason: "Participation ended" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.archived" });
    });
});
