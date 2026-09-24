// services/identity/tests/integration/current-user.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// CURRENT USER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectStatus, getJson, signInIdentity } from "./identity-integration-fixtures";

describe("Current User™ use case", () => {
    it("returns the transport-safe authenticated Identity", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();
        const response = await getJson(runtime, "/api/v1/identity/me", sessionId);

        expectStatus(response, 200);
        const body = response.json<Record<string, unknown>>();
        expect(body).toMatchObject({ userId: identity.userId, email: identity.email, status: "active", emailVerified: true });
        expect(body).not.toHaveProperty("providerUserId");
        expect(body).not.toHaveProperty("providerCredentialId");
        expect(body).not.toHaveProperty("password");
    });
});
