// tests/integration/setup-iam-integration.ts
// -----------------------------------------------------------------------------
// SETUP IAM INTEGRATION
// -----------------------------------------------------------------------------
// Boots the real IAM runtime once for the suite, isolates every certification
// case, and closes all owned lifecycle resources deterministically.
// -----------------------------------------------------------------------------

import {
    afterAll,
    beforeAll,
} from "@jest/globals";

import {
    closeIamIntegrationRuntime,
    getIamIntegrationRuntime,
} from "./support/iam-integration-runtime";

beforeAll(
    async () => {
        await getIamIntegrationRuntime();
    },
    30_000,
);

afterAll(
    async () => {
        await closeIamIntegrationRuntime();
    },
    30_000,
);
