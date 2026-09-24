// services/identity/src/state/session.ts
// -----------------------------------------------------------------------------
// IDENTITY SESSION STATE
// -----------------------------------------------------------------------------
// Canonical session lifecycle record owned by Identity Service™.
//
// BetterAuth owns session token mechanics. Identity stores provider references.
// -----------------------------------------------------------------------------

export type IdentitySessionStatus = "active" | "signed_out" | "revoked" | "expired";

export interface IdentitySessionState {
    readonly sessionId: string;
    readonly userId: string;
    readonly provider: "better-auth" | string;
    readonly providerSessionId: string;
    readonly status: IdentitySessionStatus;
    readonly issuedAt: string;
    readonly expiresAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly endedAt?: string;
}
