// services/identity/tests/integration/verify-email.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// VERIFY EMAIL USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectNoSensitivePersistence } from "./identity-integration-fixtures";

describe("Verify Email™ use case", () => {
    it("activates the canonical user and verification lifecycle", async () => {
        const identity = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();

        await expect(runtime.database.database.collection("identity_users").findOne({ userId: identity.userId })).resolves.toMatchObject({
            status: "active",
            emailVerified: true,
        });
        await expect(runtime.database.database.collection("identity_email_verifications").findOne({ verificationId: identity.verificationId })).resolves.toMatchObject({
            status: "verified",
            verifiedAt: expect.any(String),
        });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.user_email_verified" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.user.activated" });
        await expectNoSensitivePersistence([identity.verificationToken]);
    });
});
