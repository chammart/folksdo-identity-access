// services/membership/tests/integration/switch-membership-context.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// SWITCH MEMBERSHIP CONTEXT USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createMembershipCertificationContext, expectMembershipStatus, membershipPost } from "./membership-integration-fixtures";

describe("Switch Membership Context™ use case", () => {
    it("switches only to an active Membership owned by the Identity", async () => {
        const certification = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();
        const membershipId = `membership_secondary_${certification.identity.userId}`;
        const tenantId = `tenant_secondary_${certification.identity.userId}`;
        await runtime.database.database.collection("membership_memberships").insertOne({
            membershipId,
            identityId: certification.identity.userId,
            tenantId,
            membershipType: "member",
            status: "active",
            activatedAt: now,
            createdAt: now,
            updatedAt: now,
        });

        const response = await membershipPost(runtime, "/api/v1/membership/context", { membershipId }, certification.sessionId);
        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ activeMembershipId: membershipId, activeTenantId: tenantId });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "membership.context.changed" });
    });
});
