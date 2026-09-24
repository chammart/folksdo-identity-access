import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../support/iam-integration-runtime";
import { createRealMembership, expectKnownMembership, readString } from "./reaction-certification-fixtures";

describe("IAM reaction idempotency", () => {
    it("maintains one canonical Access fact while a source commit emits consecutive lifecycle messages", async () => {
        const runtime = await getIamIntegrationRuntime();
        const { membership } = await createRealMembership(true);
        const membershipId = readString(membership, "membershipId");

        await expectKnownMembership({
            membershipId,
            identityId: readString(membership, "identityId"),
            tenantId: readString(membership, "tenantId"),
            status: "active",
        });

        await expect(runtime.database.database.collection("access_known_memberships").countDocuments({ membershipId }))
            .resolves.toBe(1);
    });
});
