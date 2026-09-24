// services/identity/src/state/credential.ts
// -----------------------------------------------------------------------------
// IDENTITY CREDENTIAL STATE
// -----------------------------------------------------------------------------
// Canonical credential lifecycle record owned by Identity Service™.
//
// BetterAuth owns credential secrets. Identity stores provider references only.
// -----------------------------------------------------------------------------

export type IdentityCredentialType = "password" | "sso" | "service";
export type IdentityCredentialStatus = "active" | "pending" | "revoked";

export interface IdentityCredentialState {
    readonly credentialId: string;
    readonly userId: string;
    readonly type: IdentityCredentialType;
    readonly provider: "better-auth" | string;
    readonly providerCredentialId: string;
    readonly status: IdentityCredentialStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
}
