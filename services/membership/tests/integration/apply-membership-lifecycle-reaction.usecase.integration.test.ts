// services/membership/tests/integration/apply-membership-lifecycle-reaction.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// APPLY MEMBERSHIP LIFECYCLE REACTION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, createMembershipReactionContext } from "./membership-integration-fixtures";

describe("Apply Membership Lifecycle Reaction™ use case", () => {
    it("suspends tenant Memberships from an external tenant lifecycle fact", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification, true);
        const runtime = await getIamIntegrationRuntime();

        await runtime.server.membershipRuntime.reactions.handle(
            { eventType: "tenant.suspended", payload: { tenantId: certification.tenantId, reason: "Tenant suspended" } },
            createMembershipReactionContext(runtime, certification),
        );

        await expect(runtime.database.database.collection("membership_memberships").findOne({ membershipId: membership.membershipId })).resolves.toMatchObject({
            status: "suspended",
            suspensionSource: "tenant",
        });
        const outbox = await runtime.database.findOutboxRecords({
            subject: "membership.membership.suspended",
            "payload.membershipId": membership.membershipId,
        });
        expect(outbox).toHaveLength(1);
        expect(outbox[0]).toMatchObject({ status: "pending", attempts: 0 });
    });
});
