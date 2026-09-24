// services/identity/tests/integration/request-password-reset.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// REQUEST PASSWORD RESET USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { expectIamOutboxCommitted } from "../../../../tests/integration/support/iam-outbox-assertions";
import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectNoSensitivePersistence, requestPasswordReset } from "./identity-integration-fixtures";

describe("Request Password Reset™ use case", () => {
    it("creates the owned request event without exposing the provider token", async () => {
        const identity = await createActiveIdentity();
        const token = await requestPasswordReset(identity);
        const runtime = await getIamIntegrationRuntime();

        const events = await runtime.database.findEvents({
            aggregateId: identity.userId,
            eventType: "identity.password_reset_requested",
        });
        expect(events).toHaveLength(1);
        await expectIamOutboxCommitted({ database: runtime.database, subject: "identity.password_reset_requested" });
        await expectNoSensitivePersistence([token]);
    });
});
