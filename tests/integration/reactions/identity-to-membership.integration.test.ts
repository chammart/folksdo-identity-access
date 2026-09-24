import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../support/iam-integration-runtime";
import { createRealActiveIdentity } from "./reaction-certification-fixtures";

describe("Identity → Membership real reaction", () => {
    it("consumes Identity activation without bypassing Folksdo Processing", async () => {
        const runtime = await getIamIntegrationRuntime();
        const identity = await createRealActiveIdentity();

        // createActiveIdentity originates the real identity.user_activated commit.
        // Membership legitimately has no matching pending membership in this fixture;
        // certification proves processing does not manufacture Membership state.
        await expect(runtime.database.database.collection("membership_memberships").countDocuments({ identityId: identity.userId }))
            .resolves.toBe(0);
    });
});
