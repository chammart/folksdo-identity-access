// services/identity/src/state/email-verification.ts
// -----------------------------------------------------------------------------
// IDENTITY EMAIL VERIFICATION STATE
// -----------------------------------------------------------------------------
// Canonical email verification lifecycle record owned by Identity Service™.
//
// BetterAuth owns verification token mechanics. Identity stores provider
// references only.
// -----------------------------------------------------------------------------

export type IdentityEmailVerificationStatus =
    | "pending"
    | "verified"
    | "expired"
    | "revoked";

export interface IdentityEmailVerificationState {
    readonly verificationId: string;
    readonly userId: string;
    readonly email: string;
    readonly provider: "better-auth" | string;
    readonly providerVerificationId?: string;
    readonly status: IdentityEmailVerificationStatus;
    readonly requestedAt: string;
    readonly expiresAt: string;
    readonly verifiedAt?: string;
}
