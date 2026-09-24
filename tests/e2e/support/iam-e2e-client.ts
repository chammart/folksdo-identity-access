// tests/e2e/support/iam-e2e-client.ts
// -----------------------------------------------------------------------------
// IAM HTTP E2E CLIENT
// -----------------------------------------------------------------------------
// Exercises registered Fastify HTTP routes with real IAM runtime dependencies.
// No handler invocation, HTTP mocks, or network port allocation.
// -----------------------------------------------------------------------------

import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";

export async function requestIam(
    options: InjectOptions,
): Promise<LightMyRequestResponse> {
    const runtime = await getIamIntegrationRuntime();
    return await runtime.server.app.inject(options);
}

export async function requestIamAuthenticated(
    options: InjectOptions,
    sessionCookie: string,
): Promise<LightMyRequestResponse> {
    return await requestIam({
        ...options,
        headers: {
            ...options.headers,
            cookie: sessionCookie,
        },
    });
}
