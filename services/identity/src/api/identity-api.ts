// services/identity/src/api/identity-api.ts
// -----------------------------------------------------------------------------
// IDENTITY API
// -----------------------------------------------------------------------------
// Public synchronous API boundary for Identity Service™.
// -----------------------------------------------------------------------------
//
// Rules:
//
//   • synchronous business boundary only
//   • transport independent
//   • BetterAuth never crosses this boundary
//   • Membership and Access never cross this boundary
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type { IdentityProviderReadSecurity } from "../usecases";

import type {
    ChangePasswordRequest,
    ChangePasswordResult,
    CurrentSessionRequest,
    CurrentSessionResult,
    CurrentUserRequest,
    CurrentUserResult,
    InvitationSignUpRequest,
    InvitationSignUpResult,
    RequestPasswordResetRequest,
    RequestPasswordResetResult,
    ResetPasswordRequest,
    ResetPasswordResult,
    SignInRequest,
    SignInResult,
    SignOutRequest,
    SignOutResult,
    VerifyEmailRequest,
    VerifyEmailResult,
    ProviderIdentityResponse,
    ProviderIdentityListResponse,
} from "./identity-dtos";

export interface IdentityApi {
    invitationSignUp(
        input: InvitationSignUpRequest,
        context: RuntimeContext,
    ): Promise<InvitationSignUpResult>;

    verifyEmail(
        input: VerifyEmailRequest,
        context: RuntimeContext,
    ): Promise<VerifyEmailResult>;

    signIn(
        input: SignInRequest,
        context: RuntimeContext,
    ): Promise<SignInResult>;

    signOut(
        input: SignOutRequest,
        context: RuntimeContext,
    ): Promise<SignOutResult>;

    getCurrentSession(
        input: CurrentSessionRequest,
        context: RuntimeContext,
    ): Promise<CurrentSessionResult>;

    getCurrentUser(
        input: CurrentUserRequest,
        context: RuntimeContext,
    ): Promise<CurrentUserResult>;

    requestPasswordReset(
        input: RequestPasswordResetRequest,
        context: RuntimeContext,
    ): Promise<RequestPasswordResetResult>;

    resetPassword(
        input: ResetPasswordRequest,
        context: RuntimeContext,
    ): Promise<ResetPasswordResult>;

    /**
     * Change Password™
     *
     * Authenticated credential maintenance.
     *
     * The authenticated Identity is derived exclusively from the
     * RuntimeContext established by the host authentication layer.
     *
     * The request intentionally does NOT contain:
     *
     *   • userId
     *   • sessionId
     *   • provider identifiers
     *
     * This prevents a caller from attempting to change another
     * Identity's credentials.
     */
    changePassword(
        input: ChangePasswordRequest,
        context: RuntimeContext,
    ): Promise<ChangePasswordResult>;

    getIdentityForProvider(
        userId: string,
        context: RuntimeContext,
        security: IdentityProviderReadSecurity,
    ): Promise<ProviderIdentityResponse>;

    listIdentitiesForProvider(
        input: { readonly status?: "pending_email_verification" | "active" | "suspended" | "disabled"; readonly offset: number; readonly limit: number; },
        context: RuntimeContext,
        security: IdentityProviderReadSecurity,
    ): Promise<ProviderIdentityListResponse>;
}