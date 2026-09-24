// services/identity/tests/integration/reset-password.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// RESET PASSWORD USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import {
    createActiveIdentity,
    expectNoSensitivePersistence,
    expectStatus,
    IDENTITY_REPLACEMENT_PASSWORD,
    postJson,
    requestPasswordReset,
    signInIdentity,
} from "./identity-integration-fixtures";

describe("Reset Password™ use case", () => {
    it("updates the real provider credential and revokes canonical sessions", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const token = await requestPasswordReset(identity);
        const runtime = await getIamIntegrationRuntime();
        const response = await postJson(runtime, "/api/v1/identity/reset-password", {
            token,
            newPassword: IDENTITY_REPLACEMENT_PASSWORD,
        });

        expectStatus(response, 200);
        expect(response.json()).toEqual({ credentialUpdated: true });
        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId })).resolves.toMatchObject({ status: "signed_out" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.credential_updated" });
        await expect(signInIdentity(identity, IDENTITY_REPLACEMENT_PASSWORD)).resolves.toEqual(expect.any(String));
        await expectNoSensitivePersistence([token, IDENTITY_REPLACEMENT_PASSWORD]);
    });
});
