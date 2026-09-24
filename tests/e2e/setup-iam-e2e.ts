// tests/e2e/setup-iam-e2e.ts
// -----------------------------------------------------------------------------
// IAM HTTP E2E LIFECYCLE
// -----------------------------------------------------------------------------

import { afterAll, beforeAll, beforeEach } from "@jest/globals";
import {
    closeIamIntegrationRuntime,
    getIamIntegrationRuntime,
} from "../integration/support/iam-integration-runtime";

beforeAll(async () => {
    await getIamIntegrationRuntime();
}, 30_000);

beforeEach(async () => {
    const runtime = await getIamIntegrationRuntime();
    await runtime.clean();
}, 30_000);

afterAll(async () => {
    await closeIamIntegrationRuntime();
}, 30_000);
