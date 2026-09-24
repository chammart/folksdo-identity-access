// tests/e2e/identity/identity-sessions-password.e2e.test.ts
// -----------------------------------------------------------------------------
// IDENTITY HTTP E2E — SESSIONS AND PASSWORD LIFECYCLE
// -----------------------------------------------------------------------------
// Real public HTTP routes, Better Auth, Engine, MongoDB, and outbox.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { expectIamE2eOutboxCommitted } from "../support/iam-e2e-outbox-assertions";
import {
    createActiveIdentity,
    expectNoSensitivePersistence,
    expectStatus,
    getJson,
    IDENTITY_REPLACEMENT_PASSWORD,
    postJson,
    requestPasswordReset,
    signInIdentity,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";

describe("Identity™ public HTTP sessions and password lifecycle", () => {
    it("signs out the authenticated session and rejects subsequent use", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();

        const response = await postJson(runtime, "/api/v1/identity/sign-out", { sessionId }, sessionId);
        expectStatus(response, 200);
        expect(response.json()).toMatchObject({ sessionId, userId: identity.userId, status: "signed_out" });

        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId }))
            .resolves.toMatchObject({ status: "signed_out", endedAt: expect.any(String) });
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "identity.session_ended" });

        const revokedSession = await getJson(runtime, "/api/v1/identity/session", sessionId);
        expect(revokedSession.statusCode).toBe(401);
    });

    it("rejects unauthenticated sign-out and password changes", async () => {
        const runtime = await getIamIntegrationRuntime();
        const signOut = await postJson(runtime, "/api/v1/identity/sign-out", { sessionId: "session_unknown" });
        expect(signOut.statusCode).toBe(401);

        const changePassword = await postJson(runtime, "/api/v1/identity/change-password", {
            currentPassword: "Current!Password1",
            newPassword: "Replacement!Password2",
            revokeOtherSessions: true,
        });
        expect(changePassword.statusCode).toBe(401);
    });

    it("changes the authenticated credential without persisting plaintext passwords", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const runtime = await getIamIntegrationRuntime();

        const response = await postJson(runtime, "/api/v1/identity/change-password", {
            currentPassword: identity.password,
            newPassword: IDENTITY_REPLACEMENT_PASSWORD,
            revokeOtherSessions: true,
        }, sessionId);
        expectStatus(response, 200);
        expect(response.json()).toEqual({ credentialUpdated: true, otherSessionsRevoked: true });
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "identity.credential_updated" });

        const oldCredential = await postJson(runtime, "/api/v1/identity/sign-in", {
            email: identity.email,
            password: identity.password,
        });
        expect(oldCredential.statusCode).toBe(401);
        await expect(signInIdentity(identity, IDENTITY_REPLACEMENT_PASSWORD))
            .resolves.toEqual(expect.any(String));
        await expectNoSensitivePersistence([identity.password, IDENTITY_REPLACEMENT_PASSWORD]);
    });

    it("resets the provider credential, revokes the previous session, and protects the reset token", async () => {
        const identity = await createActiveIdentity();
        const sessionId = await signInIdentity(identity);
        const token = await requestPasswordReset(identity);
        const runtime = await getIamIntegrationRuntime();

        const response = await postJson(runtime, "/api/v1/identity/reset-password", {
            token,
            newPassword: IDENTITY_REPLACEMENT_PASSWORD,
        });
        expectStatus(response, 200);
        expect(response.json()).toEqual({ credentialUpdated: true });
        await expect(runtime.database.database.collection("identity_sessions").findOne({ sessionId }))
            .resolves.toMatchObject({ status: "signed_out" });
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "identity.password_reset_requested" });
        await expectIamE2eOutboxCommitted({ database: runtime.database, subject: "identity.credential_updated" });

        const revokedSession = await getJson(runtime, "/api/v1/identity/session", sessionId);
        expect(revokedSession.statusCode).toBe(401);
        await expect(signInIdentity(identity, IDENTITY_REPLACEMENT_PASSWORD))
            .resolves.toEqual(expect.any(String));
        await expectNoSensitivePersistence([token, IDENTITY_REPLACEMENT_PASSWORD]);
    });
});
