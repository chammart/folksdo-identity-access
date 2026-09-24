import { describe, it } from "@jest/globals";
import { createRealActiveIdentity, expectKnownIdentity } from "./reaction-certification-fixtures";

describe("Identity → Access real reaction", () => {
    it("projects an activated Identity into canonical Access known-identity state", async () => {
        const identity = await createRealActiveIdentity();
        await expectKnownIdentity(identity.userId, "active");
    });
});
