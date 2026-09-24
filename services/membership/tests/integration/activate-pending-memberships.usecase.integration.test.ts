// services/membership/tests/integration/activate-pending-memberships.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// ACTIVATE PENDING MEMBERSHIPS USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, createMembershipReactionContext } from "./membership-integration-fixtures";

describe("Activate Pending Memberships™ use case", () => {
    it("activates every pending Membership after an Identity activation fact", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();
        const identityId = String(membership.identityId);

        await runtime.server.membershipRuntime.reactions.handle(
            { eventType: "identity.user.activated", payload: { userId: identityId } },
            createMembershipReactionContext(runtime, certification),
        );

        await expect(runtime.database.database.collection("membership_memberships").findOne({ membershipId: membership.membershipId })).resolves.toMatchObject({ status: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.membership.activated" });
    });
});
