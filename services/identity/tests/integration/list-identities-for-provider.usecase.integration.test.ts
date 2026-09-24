// services/identity/tests/integration/list-identities-for-provider.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// LIST IDENTITIES FOR PROVIDER USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";

import { getIamIntegrationRuntime } from "../../../../tests/integration/support/iam-integration-runtime";
import {
    createActiveIdentity,
    expectStatus,
    getJson,
    grantProviderIdentityReads,
    signInIdentity,
} from "./identity-integration-fixtures";

describe("List Identities For Provider™ use case", () => {
    it("authorizes, filters, paginates, and returns transport-safe identities", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();
        await grantProviderIdentityReads(identity);

        const response = await getJson(runtime, "/api/v1/identities?status=active&offset=0&limit=25", sessionId);
        expectStatus(response, 200);

        const body = response.json<{
            readonly items: readonly Record<string, unknown>[];
            readonly total: number;
            readonly offset: number;
            readonly limit: number;
        }>();
        expect(body).toMatchObject({ total: 1, offset: 0, limit: 25 });
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({ userId: identity.userId, status: "active" });
        expect(JSON.stringify(body)).not.toContain("providerCredentialId");
        expect(JSON.stringify(body)).not.toContain("password");
    });
});
