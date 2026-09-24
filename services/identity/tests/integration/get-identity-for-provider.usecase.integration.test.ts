// services/identity/tests/integration/get-identity-for-provider.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// GET IDENTITY FOR PROVIDER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import {
    createActiveIdentity,
    expectStatus,
    getJson,
    grantProviderIdentityReads,
    prepareProviderIdentityReadContext,
    signInIdentity,
} from "./identity-integration-fixtures";

describe("Get Identity For Provider™ use case", () => {
    it("enforces the Identity → Membership → Access chain and returns no provider secrets", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();

        await prepareProviderIdentityReadContext(identity);
        const denied = await getJson(runtime, `/api/v1/identities/${identity.userId}`, sessionId);
        expect(denied.statusCode).toBe(403);

        await grantProviderIdentityReads(identity);
        const response = await getJson(runtime, `/api/v1/identities/${identity.userId}`, sessionId);
        expectStatus(response, 200);

        const body = response.json<Record<string, unknown>>();
        expect(body).toMatchObject({ userId: identity.userId, email: identity.email, status: "active", emailVerified: true });
        expect(body).not.toHaveProperty("providerUserId");
        expect(body).not.toHaveProperty("providerCredentialId");
        expect(body).not.toHaveProperty("password");
    });
});
