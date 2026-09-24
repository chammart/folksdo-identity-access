import { describe, it } from "@jest/globals";
import { createRealMembership, expectKnownMembership, readString } from "./reaction-certification-fixtures";

describe("Membership → Access real reaction", () => {
    it("projects a real Membership commit into canonical Access known-membership state", async () => {
        const { membership } = await createRealMembership(false);
        await expectKnownMembership({
            membershipId: readString(membership, "membershipId"),
            identityId: readString(membership, "identityId"),
            tenantId: readString(membership, "tenantId"),
            status: "pending",
        });
    });
});
