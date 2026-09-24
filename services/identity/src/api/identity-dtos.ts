// services/identity/src/api/identity-dtos.ts
// -----------------------------------------------------------------------------
// IDENTITY DTOs
// -----------------------------------------------------------------------------
// Public transport-safe DTOs for Identity Service™.
// -----------------------------------------------------------------------------
//
// Rules:
//
//   • DTOs never expose BetterAuth concepts
//   • DTOs never expose provider identifiers
//   • DTOs never expose Membership or Access information
//   • DTOs remain stable across provider implementations
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// INVITATION SIGN UP
// -----------------------------------------------------------------------------

export interface InvitationSignUpRequest {
    readonly invitationToken: string;
    readonly email: string;
    readonly password: string;
    readonly displayName?: string;
    readonly locale?: string;
    readonly timezone?: string;
}

export interface InvitationSignUpResult {
    readonly userId: string;
    readonly sessionId: string;
    readonly status:
    | "pending_email_verification"
    | "active";
    readonly emailVerificationRequired: boolean;
}

// -----------------------------------------------------------------------------
// VERIFY EMAIL
// -----------------------------------------------------------------------------

export interface VerifyEmailRequest {
    readonly verificationId: string;
    readonly verificationToken: string;
}

export interface VerifyEmailResult {
    readonly userId: string;
    readonly status: "active";
    readonly emailVerified: true;
}

// -----------------------------------------------------------------------------
// SIGN IN
// -----------------------------------------------------------------------------

export interface SignInRequest {
    readonly email: string;
    readonly password: string;
}

export interface SignInResult {
    readonly userId: string;
    readonly email: string;
    readonly sessionId: string;
    readonly expiresAt: string;
}

// -----------------------------------------------------------------------------
// SIGN OUT
// -----------------------------------------------------------------------------

export interface SignOutRequest {
    readonly sessionId: string;
}

export interface SignOutResult {
    readonly userId: string;
    readonly sessionId: string;
    readonly status: "signed_out";
    readonly endedAt: string;
}

// -----------------------------------------------------------------------------
// CURRENT SESSION
// -----------------------------------------------------------------------------

export interface CurrentSessionRequest {
    readonly sessionId: string;
}

export interface CurrentSessionResult {
    readonly sessionId: string;
    readonly userId: string;
    readonly status: "active";
    readonly createdAt: string;
    readonly expiresAt: string;
}

// -----------------------------------------------------------------------------
// CURRENT USER
// -----------------------------------------------------------------------------

export interface CurrentUserRequest {
    readonly sessionId: string;
}

export interface CurrentUserResult {
    readonly userId: string;
    readonly email: string;
    readonly status: string;
    readonly emailVerified: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// REQUEST PASSWORD RESET
// -----------------------------------------------------------------------------

export interface RequestPasswordResetRequest {
    readonly email: string;
}

export interface RequestPasswordResetResult {
    readonly passwordResetRequested: true;
}

// -----------------------------------------------------------------------------
// RESET PASSWORD
// -----------------------------------------------------------------------------

export interface ResetPasswordRequest {
    readonly token: string;
    readonly newPassword: string;
}

export interface ResetPasswordResult {
    readonly credentialUpdated: true;
}

// -----------------------------------------------------------------------------
// CHANGE PASSWORD
// -----------------------------------------------------------------------------

export interface ChangePasswordRequest {
    /**
     * Current password known by the authenticated user.
     */
    readonly currentPassword: string;

    /**
     * Replacement password satisfying Identity password policy.
     */
    readonly newPassword: string;

    /**
     * When true, revoke every other active session after the password
     * has been changed while preserving the current authenticated session.
     *
     * Defaults to true when omitted.
     */
    readonly revokeOtherSessions?: boolean;
}

export interface ChangePasswordResult {
    /**
     * Identity credential lifecycle completed successfully.
     */
    readonly credentialUpdated: true;

    /**
     * Indicates whether other active sessions were revoked.
     */
    readonly otherSessionsRevoked: boolean;
}

// -----------------------------------------------------------------------------
// PROVIDER IDENTITY READS
// -----------------------------------------------------------------------------

export interface ProviderIdentityResponse {
    readonly userId: string;
    readonly email: string;
    readonly status: "pending_email_verification" | "active" | "suspended" | "disabled";
    readonly emailVerified: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly activatedAt?: string;
}

export interface ProviderIdentityListResponse {
    readonly items: readonly ProviderIdentityResponse[];
    readonly total: number;
    readonly offset: number;
    readonly limit: number;
}
