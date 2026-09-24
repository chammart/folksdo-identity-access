// services/membership/tests/integration/get-membership.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// GET MEMBERSHIP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("Get Membership™ use case", () => {
    it("returns Membership state within the active tenant boundary", async () => {
        const certification = await createMembershipCertificationContext();
        const membership = await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, `/api/v1/membership/${String(membership.membershipId)}`, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toMatchObject({ membershipId: membership.membershipId, tenantId: certification.tenantId });
    });
});
