// services/identity/tests/integration/change-password.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// CHANGE PASSWORD USE CASE INTEGRATION TEST
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
    signInIdentity,
} from "./identity-integration-fixtures";

describe("Change Password™ use case", () => {
    it("changes the authenticated credential without leaking either password", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();
        const response = await postJson(runtime, "/api/v1/identity/change-password", {
            currentPassword: identity.password,
            newPassword: IDENTITY_REPLACEMENT_PASSWORD,
            revokeOtherSessions: true,
        }, sessionId);

        expectStatus(response, 200);
        expect(response.json()).toEqual({ credentialUpdated: true, otherSessionsRevoked: true });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.credential_updated" });

        const rejected = await postJson(runtime, "/api/v1/identity/sign-in", { email: identity.email, password: identity.password });
        expect(rejected.statusCode).toBe(401);
        await expect(signInIdentity(identity, IDENTITY_REPLACEMENT_PASSWORD)).resolves.toEqual(expect.any(String));
        await expectNoSensitivePersistence([identity.password, IDENTITY_REPLACEMENT_PASSWORD]);
    });
});
