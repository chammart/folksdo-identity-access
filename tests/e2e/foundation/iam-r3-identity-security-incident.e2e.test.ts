// tests/e2e/foundation/iam-r3-identity-security-incident.e2e.test.ts
// -----------------------------------------------------------------------------
// R3 RELEASE GATE — IDENTITY SECURITY INCIDENT
// -----------------------------------------------------------------------------
// Real HTTP + Engine + MongoDB + NATS. No HTTP mocks.
// -----------------------------------------------------------------------------
import { describe, expect, it } from "@jest/globals";
import { createActiveIdentity, grantProviderIdentitySecurityAdministration, IDENTITY_TEST_PASSWORD } from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createAccessAdministrativeContext } from "../access/support/access-authenticated-fixtures";

describe("R3 Identity Security Administration release gate", () => {
    it("investigates and responds to an Identity security incident without exposing secrets", async () => {
        const provider = await createAccessAdministrativeContext();
        await grantProviderIdentitySecurityAdministration(provider.identity);
        const target = await createActiveIdentity();
        const runtime = await getIamIntegrationRuntime();

        const signedIn = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(signedIn.statusCode).toBe(200);

        const summary = await call("GET", `/api/v1/identities/${target.userId}/security-summary`);
        expect(summary.statusCode).toBe(200);
        expect(summary.json()).toMatchObject({ userId: target.userId, identityStatus: "active", authentication: { signInEligible: true } });

        const historyBefore = await call("GET", `/api/v1/identities/${target.userId}/security-history`);
        expect(historyBefore.statusCode).toBe(200);
        expect(historyBefore.json().events).toEqual(expect.arrayContaining([expect.objectContaining({ eventType: "identity.session_created", occurredAt: expect.any(String) })]));
        expect(historyBefore.body).not.toContain("token");
        expect(historyBefore.body).not.toContain("providerSessionId");
        expect(historyBefore.body).not.toContain("credentialId");
        expect(historyBefore.body).not.toContain("password");

        const sessions = await call("GET", `/api/v1/identities/${target.userId}/sessions`);
        expect(sessions.statusCode).toBe(200);
        expect(sessions.json().items.length).toBeGreaterThan(0);

        expect((await call("POST", `/api/v1/identities/${target.userId}/sessions/revoke-all`)).statusCode).toBe(200);
        expect((await call("POST", `/api/v1/identities/${target.userId}/recovery`)).statusCode).toBe(200);
        expect((await call("POST", `/api/v1/identities/${target.userId}/suspend`)).statusCode).toBe(200);

        const blocked = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(blocked.statusCode).toBe(403);

        expect((await call("POST", `/api/v1/identities/${target.userId}/reactivate`)).statusCode).toBe(200);
        const restored = await runtime.server.app.inject({ method: "POST", url: "/api/v1/identity/sign-in", payload: { email: target.email, password: IDENTITY_TEST_PASSWORD } });
        expect(restored.statusCode).toBe(200);

        const historyAfter = await call("GET", `/api/v1/identities/${target.userId}/security-history`);
        expect(historyAfter.statusCode).toBe(200);
        expect(historyAfter.json().events).toEqual(expect.arrayContaining([
            expect.objectContaining({ eventType: "identity.password_reset_requested" }),
            expect.objectContaining({ eventType: "identity.user_suspended" }),
            expect.objectContaining({ eventType: "identity.user_reactivated" }),
            expect.objectContaining({ eventType: "identity.session_ended" }),
        ]));
        for (const event of historyAfter.json().events) {
            expect(event).toEqual(expect.objectContaining({ eventType: expect.any(String), occurredAt: expect.any(String), aggregateType: expect.any(String), aggregateId: expect.any(String) }));
        }
        expect(historyAfter.body).not.toContain("token");
        expect(historyAfter.body).not.toContain("providerSessionId");
        expect(historyAfter.body).not.toContain("passwordHash");
        expect(historyAfter.body).not.toContain("passwordCredentialId");
        expect(historyAfter.body).not.toContain("secret");

        async function call(method: "GET" | "POST", url: string) {
            return await runtime.server.app.inject({ method, url, headers: { authorization: `Bearer ${provider.sessionId}` } });
        }
    });
});
