// tests/e2e/identity/provider-identity-lifecycle-security-summary.e2e.test.ts
// -----------------------------------------------------------------------------
// R3 PATCH 2 — IDENTITY LIFECYCLE + SECURITY SUMMARY E2E
// -----------------------------------------------------------------------------
// Real HTTP + Engine + MongoDB + NATS certification. No HTTP mocks.
// -----------------------------------------------------------------------------
import { describe, expect, it } from "@jest/globals";
import { createActiveIdentity, grantProviderIdentitySecurityAdministration, IDENTITY_TEST_PASSWORD } from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("R3 Patch 2 — Identity lifecycle and security summary", () => {
    it("suspends an Identity, revokes sessions, propagates Access ineligibility, and reactivates eligibility without restoring sessions", async () => {
        const provider = await createAccessAdministrativeContext();
        await grantProviderIdentitySecurityAdministration(provider.identity);
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();
        const targetSession = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(targetSession.statusCode).toBe(200);

        const before = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/security-summary`);
        expect(before.statusCode).toBe(200);
        expect(before.json()).toMatchObject({ userId: target.userId, identityStatus: "active", verification: { emailVerified: true, state: "verified" }, authentication: { credentialActive: true, signInEligible: true }, indicators: { suspended: false } });
        expect(before.body).not.toContain("providerCredentialId");
        expect(before.body).not.toContain("providerSessionId");
        expect(before.body).not.toContain("token");

        const suspended = await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/suspend`);
        expect(suspended.statusCode).toBe(200);
        expect(suspended.json()).toMatchObject({ userId: target.userId, status: "suspended", revokedSessions: expect.any(Number) });
        expect(suspended.json().revokedSessions).toBeGreaterThanOrEqual(1);
        await waitForKnownIdentityStatus(runtime, target.userId, "disabled");
        expect(await runtime.database.database.collection("identity_users").findOne({ userId: target.userId })).toMatchObject({ status: "suspended" });
        expect(await runtime.database.database.collection("identity_sessions").countDocuments({ userId: target.userId, status: "active" })).toBe(0);

        const blockedSignIn = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(blockedSignIn.statusCode).toBe(403);

        const during = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/security-summary`);
        expect(during.statusCode).toBe(200);
        expect(during.json()).toMatchObject({ identityStatus: "suspended", authentication: { signInEligible: false }, sessions: { active: 0 }, indicators: { suspended: true, activeSessionsPresent: false } });

        const reactivated = await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/reactivate`);
        expect(reactivated.statusCode).toBe(200);
        expect(reactivated.json()).toMatchObject({ userId: target.userId, status: "active", revokedSessions: 0 });
        await waitForKnownIdentityStatus(runtime, target.userId, "active");
        expect(await runtime.database.database.collection("identity_sessions").countDocuments({ userId: target.userId, status: "active" })).toBe(0);

        const newSignIn = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(newSignIn.statusCode).toBe(200);
    });

    it("includes safe recovery state in the security summary", async () => {
        const provider = await createAccessAdministrativeContext();
        await grantProviderIdentitySecurityAdministration(provider.identity);
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();
        expect((await request(runtime, provider.sessionId, "POST", `/api/v1/identities/${target.userId}/recovery`)).statusCode).toBe(200);
        const summary = await request(runtime, provider.sessionId, "GET", `/api/v1/identities/${target.userId}/security-summary`);
        expect(summary.statusCode).toBe(200);
        expect(summary.json()).toMatchObject({ recovery: { state: "requested", lastRequestedAt: expect.any(String) }, indicators: { recoveryInProgress: true } });
        expect(summary.body).not.toContain("passwordResetRequestId");
        expect(summary.body).not.toContain("token");
    });
});

async function waitForKnownIdentityStatus(runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>, identityId: string, status: string): Promise<void> {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
        const identity = await runtime.database.database.collection("access_known_identities").findOne({ identityId });
        if (identity?.status === status) {
            expect(identity).toMatchObject({ identityId, status });
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for Access known Identity ${identityId} to become ${status}`);
}
async function request(runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>, sessionId: string, method: "GET" | "POST", url: string) { return await runtime.server.app.inject({ method, url, headers: { authorization: `Bearer ${sessionId}` } }); }
