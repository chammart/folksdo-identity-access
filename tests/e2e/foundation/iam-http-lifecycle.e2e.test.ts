// tests/e2e/foundation/iam-http-lifecycle.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM HTTP LIFECYCLE CERTIFICATION
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { requestIam } from "../support/iam-e2e-client";

describe("IAM real HTTP server", () => {
    it("serves liveness and readiness through registered HTTP routes", async () => {
        const live = await requestIam({
            method: "GET",
            url: "/health/live",
        });
        expect(live.statusCode).toBe(200);
        expect(live.json()).toEqual({ status: "alive" });

        const ready = await requestIam({
            method: "GET",
            url: "/health/ready",
        });
        expect(ready.statusCode).toBe(200);
        expect(ready.json()).toMatchObject({
            status: "ready",
            dependencies: {
                platformRuntime: true,
                accessRuntime: true,
            },
        });
    });
});
