// services/identity/src/runtime/identity-service-config.ts
// -----------------------------------------------------------------------------
// IDENTITY SERVICE CONFIG
// -----------------------------------------------------------------------------
// Public configuration contract for Identity Service™ runtime.
//
// Purpose:
//   • define Identity-owned runtime configuration
//   • keep Identity configuration owned by Identity
//   • let hosts pass validated service config without knowing Identity internals
//
// This is a service boundary contract.
// -----------------------------------------------------------------------------

export interface IdentityServiceConfig {
    readonly betterAuthBaseUrl: string;

    readonly betterAuthSecret: string;

    readonly betterAuthTrustedOrigins: readonly string[];

    readonly invitationSignUpSessionTtlMilliseconds: number;

    readonly signInSessionTtlMilliseconds: number;

    readonly emailVerificationTtlMilliseconds: number;

    readonly acceptanceCaptureEnabled: boolean;

    readonly acceptanceCapturesCollectionName: string;
}