// services/identity/tests/integration/current-session.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// CURRENT SESSION USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import { createActiveIdentity, expectStatus, getJson, signInIdentity } from "./identity-integration-fixtures";

describe("Current Session™ use case", () => {
    it("returns only the active canonical session", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();
        const response = await getJson(runtime, "/api/v1/identity/session", sessionId);

        expectStatus(response, 200);
        expect(response.json()).toEqual(expect.objectContaining({
            sessionId,
            userId: identity.userId,
            status: "active",
        }));
    });
});
