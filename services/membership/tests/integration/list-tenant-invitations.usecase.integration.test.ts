// services/membership/tests/integration/list-tenant-invitations.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// LIST TENANT INVITATIONS USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createCertifiedInvitation, createMembershipCertificationContext, expectMembershipStatus, membershipGet } from "./membership-integration-fixtures";

describe("List Tenant Invitations™ use case", () => {
    it("filters invitations by tenant and lifecycle status", async () => {
        const certification = await createMembershipCertificationContext();
        const invitation = await createCertifiedInvitation(certification);
        const runtime = await getIamIntegrationRuntime();
        const response = await membershipGet(runtime, `/api/v1/membership/tenants/${certification.tenantId}/invitations?status=pending`, certification.sessionId);

        expectMembershipStatus(response, 200);
        expect(response.json()).toEqual([expect.objectContaining({ invitationId: invitation.invitationId, status: "pending" })]);
    });
});
