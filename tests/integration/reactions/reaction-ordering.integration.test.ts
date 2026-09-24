import { describe, it } from "@jest/globals";
import { createRealMembership, expectKnownMembership, readString } from "./reaction-certification-fixtures";

describe("IAM reaction ordering", () => {
    it("observes Membership created before activated and converges to active Access state", async () => {
        const { membership } = await createRealMembership(true);
        await expectKnownMembership({
            membershipId: readString(membership, "membershipId"),
            identityId: readString(membership, "identityId"),
            tenantId: readString(membership, "tenantId"),
            status: "active",
        });
    });
});
