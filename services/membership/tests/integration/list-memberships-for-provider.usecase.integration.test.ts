// services/membership/tests/integration/list-memberships-for-provider.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// LIST MEMBERSHIPS FOR PROVIDER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("List Memberships For Provider™ use case", () => {
    it("uses the real security chain and returns tenant-isolated Memberships", async () => {
        const certification = await createMembershipCertificationContext();
        await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, `/api/v1/membership/memberships?tenantId=${certification.tenantId}`, certification.sessionId);

        expectMembershipStatus(response, 200);
        const items = response.json<readonly Record<string, unknown>[]>();
        expect(items.length).toBeGreaterThanOrEqual(2);
        expect(items.every((item) => item.tenantId === certification.tenantId)).toBe(true);
    });
});
