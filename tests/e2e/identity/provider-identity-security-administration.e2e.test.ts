// tests/e2e/identity/provider-identity-security-administration.e2e.test.ts
// -----------------------------------------------------------------------------
// R3 PATCH 1 — PROVIDER IDENTITY SECURITY ADMINISTRATION E2E
// -----------------------------------------------------------------------------
// Real HTTP certification for safe session administration and provider recovery.
// No HTTP mocks. Session/provider secrets and credentials must never be exposed.
// -----------------------------------------------------------------------------
import { describe, expect, it } from "@jest/globals";
import { createActiveIdentity, grantProviderIdentitySecurityAdministration, IDENTITY_TEST_PASSWORD } from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("R3 Patch 1 — Provider Identity security administration", () => {
    it("lists safe sessions, revokes one/all sessions, and initiates recovery without exposing secrets", async () => {
        const provider = await createAccessAdministrativeContext();
        await grantProviderIdentitySecurityAdministration(provider.identity);
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();

        const secondSignIn = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(secondSignIn.statusCode).toBe(200);
        const secondSessionId = String(secondSignIn.json().sessionId);

        const list = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/sessions`);
        expect(list.statusCode).toBe(200);
        expect(list.json().items).toEqual(expect.arrayContaining([expect.objectContaining({ sessionId: target.sessionId, userId: target.userId, status: "active" }), expect.objectContaining({ sessionId: secondSessionId, userId: target.userId, status: "active" })]));
        expect(list.body).not.toContain("providerSessionId");
        expect(list.body).not.toContain("token");
        expect(list.body).not.toContain("password");

        const detail = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/sessions/${secondSessionId}`);
        expect(detail.statusCode).toBe(200);
        expect(detail.json()).toMatchObject({ sessionId: secondSessionId, userId: target.userId, status: "active" });
        expect(detail.body).not.toContain("providerSessionId");

        const revoke = await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/sessions/${secondSessionId}/revoke`);
        expect(revoke.statusCode).toBe(200);
        expect(revoke.json()).toMatchObject({ userId: target.userId, sessionId: secondSessionId, status: "revoked" });
        const revoked = await runtime.database.database.collection("identity_sessions").findOne({ sessionId: secondSessionId });
        expect(revoked?.status).toBe("revoked");

        const revokeAll = await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/sessions/revoke-all`);
        expect(revokeAll.statusCode).toBe(200);
        expect(revokeAll.json()).toMatchObject({ userId: target.userId, revokedSessions: expect.any(Number) });
        expect(revokeAll.json().revokedSessions).toBeGreaterThanOrEqual(1);
        const activeSessions = await runtime.database.database.collection("identity_sessions").countDocuments({ userId: target.userId, status: "active" });
        expect(activeSessions).toBe(0);

        const recovery = await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/recovery`);
        expect(recovery.statusCode).toBe(200);
        expect(recovery.json()).toEqual({ userId: target.userId, recoveryInitiated: true });
        expect(recovery.body).not.toContain("token");
        expect(recovery.body).not.toContain("password");
        const recoveryState = await runtime.database.database.collection("identity_password_reset_requests").findOne({ userId: target.userId });
        expect(recoveryState).not.toBeNull();
    });

    it("denies provider security administration when the caller lacks the required Access permission", async () => {
        const provider = await createAccessAdministrativeContext();
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();
        const response = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/sessions`);
        expect(response.statusCode).toBe(403);
    });
});

async function request(runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>, sessionId: string, method: "GET" | "POST", url: string) {
    return await runtime.server.app.inject({ method, url, headers: { authorization: `Bearer ${sessionId}` } });
}
