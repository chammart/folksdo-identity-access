// tests/e2e/access/access-http-security.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ PUBLIC HTTP SECURITY CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises registered Access routes through the real IAM Fastify server.
// No authentication mocks, direct use-case calls, or manufactured events.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";

const protectedRoutes = [
    { method: "POST", url: "/api/v1/access/permissions", payload: {} },
    { method: "GET", url: "/api/v1/access/permissions" },
    { method: "POST", url: "/api/v1/access/roles", payload: {} },
    { method: "GET", url: "/api/v1/access/roles" },
    { method: "POST", url: "/api/v1/access/role-assignments", payload: {} },
    { method: "GET", url: "/api/v1/access/role-assignments" },
    { method: "POST", url: "/api/v1/access/policies", payload: {} },
    { method: "GET", url: "/api/v1/access/policies" },
    { method: "POST", url: "/api/v1/access/restrictions", payload: {} },
    { method: "GET", url: "/api/v1/access/restrictions" },
    {
        method: "POST",
        url: "/api/v1/access/authorize",
        payload: {
            action: "membership.read",
            resource: {
                type: "membership",
            },
        },
    },
] as const;

describe("Access™ public HTTP security", () => {
    it.each(protectedRoutes)(
        "rejects an unauthenticated $method $url before request validation",
        async ({ method, url, ...options }) => {
            const runtime = await getIamIntegrationRuntime();

            const response = await runtime.server.app.inject({
                method,
                url,
                ...options,
            });

            expect(response.statusCode).toBe(401);
            expect(response.json()).toMatchObject({
                error: { code: expect.any(String) },
            });
        },
    );
});