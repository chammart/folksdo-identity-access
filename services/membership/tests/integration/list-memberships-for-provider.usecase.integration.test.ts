// services/membership/tests/integration/list-memberships-for-provider.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// LIST MEMBERSHIPS FOR PROVIDER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";

import {
    createCertifiedMembership,
    createMembershipCertificationContext,
    expectMembershipStatus,
    membershipGet,
} from "./membership-integration-fixtures";

describe("List Memberships For Provider™ use case", () => {
    it("supports provider administration filtering and pagination through the real security chain", async () => {
        const certification =
            await createMembershipCertificationContext();

        const pendingMembership =
            await createCertifiedMembership(
                certification,
            );

        await createCertifiedMembership(
            certification,
            true,
        );

        const runtime =
            await getIamIntegrationRuntime();

        const response =
            await membershipGet(
                runtime,
                `/api/v1/membership/memberships?tenantId=${certification.tenantId}&status=pending&membershipType=member&createdFrom=2000-01-01T00%3A00%3A00.000Z&createdTo=2100-01-01T00%3A00%3A00.000Z&offset=0&limit=1`,
                certification.sessionId,
            );

        expectMembershipStatus(
            response,
            200,
        );

        const result =
            response.json<{
                readonly items: readonly Record<string, unknown>[];
                readonly total: number;
                readonly offset: number;
                readonly limit: number;
            }>();

        expect(result.offset).toBe(0);
        expect(result.limit).toBe(1);
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({
            tenantId:
                certification.tenantId,
            status:
                "pending",
            membershipType:
                "member",
        });

        const identityResponse =
            await membershipGet(
                runtime,
                `/api/v1/membership/memberships?identityId=${pendingMembership.identityId}&status=pending`,
                certification.sessionId,
            );

        expectMembershipStatus(
            identityResponse,
            200,
        );

        expect(
            identityResponse.json<{
                readonly items: readonly Record<string, unknown>[];
                readonly total: number;
            }>(),
        ).toMatchObject({
            total:
                1,
            items: [
                {
                    membershipId:
                        pendingMembership.membershipId,
                    identityId:
                        pendingMembership.identityId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "pending",
                },
            ],
        });
    });

    it("rejects invalid provider lifecycle ranges as validation_error", async () => {
        const certification =
            await createMembershipCertificationContext();

        const runtime =
            await getIamIntegrationRuntime();

        const response =
            await membershipGet(
                runtime,
                "/api/v1/membership/memberships?createdFrom=2100-01-01T00%3A00%3A00.000Z&createdTo=2000-01-01T00%3A00%3A00.000Z",
                certification.sessionId,
            );

        expectMembershipStatus(
            response,
            400,
        );

        expect(response.json()).toMatchObject({
            error: {
                code:
                    "validation_error",
            },
        });
    });

    it("denies provider listing when the explicit Membership list grant is absent", async () => {
        const certification =
            await createMembershipCertificationContext();

        const runtime =
            await getIamIntegrationRuntime();

        await runtime.database.database
            .collection("access_permission_assignments")
            .deleteMany({
                identityId:
                    certification.identity.userId,
                permissionId:
                    "permission_membership_member_list",
            });

        const response =
            await membershipGet(
                runtime,
                "/api/v1/membership/memberships?limit=10",
                certification.sessionId,
            );

        expectMembershipStatus(
            response,
            403,
        );
    });
});
