// services/identity/tests/integration/sign-out.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// SIGN OUT USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectStatus, postJson, signInIdentity } from "./identity-integration-fixtures";

describe("Sign Out™ use case", () => {
    it("ends the authenticated canonical session", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();
        const response = await postJson(runtime, "/api/v1/identity/sign-out", { sessionId }, sessionId);

        expectStatus(response, 200);
        expect(response.json()).toMatchObject({ sessionId, userId: identity.userId, status: "signed_out" });
        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId })).resolves.toMatchObject({
            status: "signed_out",
            endedAt: expect.any(String),
        });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.session_ended" });
    });
});
