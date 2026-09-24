// services/membership/tests/integration/current-membership-context.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// CURRENT MEMBERSHIP CONTEXT USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("Current Membership Context™ use case", () => {
    it("returns the authenticated Identity active tenant context", async () => {
        const certification = await createMembershipCertificationContext();
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, "/api/v1/membership/current", certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({
            identityId: certification.identity.userId,
            activeMembershipId: certification.membershipId,
            activeTenantId: certification.tenantId,
        });
    });
});
