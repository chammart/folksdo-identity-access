// tests/e2e/identity/identity-lifecycle.e2e.test.ts
// -----------------------------------------------------------------------------
// IDENTITY HTTP E2E — SIGNUP, VERIFICATION, SESSION, SECURITY
// -----------------------------------------------------------------------------
// Real HTTP routes, Identity runtime, BetterAuth, MongoDB, Engine and outbox.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { expectIamOutboxCommitted } from "../../integration/support/iam-outbox-assertions";
import {
    createActiveIdentity,
    createPendingIdentity,
    expectStatus,
    getJson,
    postJson,
    signInIdentity,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";

describe("Identity™ public HTTP lifecycle", () => {
    it("signs up from a real invitation and verifies email through public routes", async () => {
        const identity = await createPendingIdentity();
        const runtime = await getIamIntegrationRuntime();

        await expect(runtime.database.database.collection("identity_users").findOne({
            userId: identity.userId,
        })).resolves.toMatchObject({ userId: identity.userId });

        const verification = await postJson(runtime, "/api/v1/identity/verify-email", {
            verificationId: identity.verificationId,
            verificationToken: identity.verificationToken,
        });
        expectStatus(verification, 200);

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "identity.user.activated",
            expected: { payload: { userId: identity.userId } },
        });
    });

    it("signs in and reads the authenticated session through public routes", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();

        const session = await getJson(runtime, "/api/v1/identity/session", sessionId);
        expectStatus(session, 200);
        expect(session.json()).toMatchObject({
            sessionId,
            userId: identity.userId,
            status: "active",
        });

        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId }))
            .resolves.toMatchObject({ userId: identity.userId, status: "active" });
    });

    it("rejects missing authentication, invalid credentials, and invalid input", async () => {
        const runtime = await getIamIntegrationRuntime();
        const unauthenticated = await runtime.server.app.inject({
            method: "GET",
            url: "/api/v1/identity/session",
        });
        expect(unauthenticated.statusCode).toBe(401);

        const invalidCredentials = await postJson(runtime, "/api/v1/identity/sign-in", {
            email: `unknown-${randomUUID()}@example.com`,
            password: "Incorrect!Password1",
        });
        expect(invalidCredentials.statusCode).toBe(401);

        const invalidInput = await postJson(runtime, "/api/v1/identity/sign-in", {
            email: "not-an-email",
            password: "",
        });
        expect(invalidInput.statusCode).toBe(400);
        expect(invalidInput.json()).toMatchObject({
            error: { code: "validation_error" },
        });
    });
});
