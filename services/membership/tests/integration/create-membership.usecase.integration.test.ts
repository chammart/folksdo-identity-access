// services/membership/tests/integration/create-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext } from "./membership-integration-fixtures";

describe("Create Membership™ use case", () => {
    it("commits canonical Membership state, event, and outbox", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();

        await expect(runtime.database.database.collection("membership_memberships").findOne({ membershipId: membership.membershipId })).resolves.toMatchObject({
            tenantId: certification.tenantId,
            status: "pending",
        });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.created" });
    });
});
