// services/membership/tests/integration/list-tenant-memberships.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// LIST TENANT MEMBERSHIPS USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedMembership, createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("List Tenant Memberships™ use case", () => {
    it("lists only Memberships owned by the requested tenant", async () => {
        const certification = await createMembershipCertificationContext();
        await createCertifiedMembership(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, `/api/v1/membership/tenant/${certification.tenantId}`, certification.sessionId);

        expectMembershipStatus(response, 200);
        const items = response.json<readonly Record<string, unknown>[]>();
        expect(items.length).toBeGreaterThanOrEqual(2);
        expect(items.every((item) => item.tenantId === certification.tenantId)).toBe(true);
    });
});
