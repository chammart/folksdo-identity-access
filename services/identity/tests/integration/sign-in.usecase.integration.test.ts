// services/identity/tests/integration/sign-in.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// SIGN IN USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectNoSensitivePersistence, signInIdentity } from "./identity-integration-fixtures";

describe("Sign In™ use case", () => {
    it("creates a canonical session through BetterAuth", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();

        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId })).resolves.toMatchObject({
            userId: identity.userId,
            status: "active",
            provider: "better-auth",
        });
        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "identity.session_created",
            expected: { payload: { sessionId, userId: identity.userId } },
        });
        await expectNoSensitivePersistence([identity.password]);
    });
});
