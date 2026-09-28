// services/identity/src/runtime/create-identity-api.ts
// -----------------------------------------------------------------------------
// CREATE IDENTITY API
// -----------------------------------------------------------------------------
// Composes the public IdentityApi from service use cases.
// -----------------------------------------------------------------------------

import type {
    IdentityApi,
} from "../api";

import type {
    ChangePasswordUseCase,
    CurrentSessionUseCase,
    CurrentUserUseCase,
    InvitationSignUpUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    SignInUseCase,
    SignOutUseCase,
    VerifyEmailUseCase,
    GetIdentityForProviderUseCase,
    ListIdentitiesForProviderUseCase,
    GetIdentityForTenantAdministrationUseCase,
    GetIdentitySecuritySummaryUseCase,
    GetIdentitySecurityHistoryUseCase,
    ProviderSessionAdministrationUseCase,
    ProviderRecoveryInitiationUseCase,
    ProviderIdentityLifecycleUseCase,
} from "../usecases";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateIdentityApiInput {
    readonly invitationSignUpUseCase:
    InvitationSignUpUseCase;

    readonly verifyEmailUseCase:
    VerifyEmailUseCase;

    readonly signInUseCase:
    SignInUseCase;

    readonly signOutUseCase:
    SignOutUseCase;

    readonly currentSessionUseCase:
    CurrentSessionUseCase;

    readonly currentUserUseCase:
    CurrentUserUseCase;

    readonly requestPasswordResetUseCase:
    RequestPasswordResetUseCase;

    readonly resetPasswordUseCase:
    ResetPasswordUseCase;

    readonly changePasswordUseCase:
    ChangePasswordUseCase;

    readonly getIdentityForProviderUseCase:
    GetIdentityForProviderUseCase;

    readonly listIdentitiesForProviderUseCase:
    ListIdentitiesForProviderUseCase;

    readonly getIdentityForTenantAdministrationUseCase:
    GetIdentityForTenantAdministrationUseCase;

    readonly getIdentitySecuritySummaryUseCase:
    GetIdentitySecuritySummaryUseCase;

    readonly getIdentitySecurityHistoryUseCase:
    GetIdentitySecurityHistoryUseCase;

    readonly providerSessionAdministrationUseCase:
    ProviderSessionAdministrationUseCase;

    readonly providerRecoveryInitiationUseCase:
    ProviderRecoveryInitiationUseCase;

    readonly providerIdentityLifecycleUseCase:
    ProviderIdentityLifecycleUseCase;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createIdentityApi(
    input:
        CreateIdentityApiInput,
): IdentityApi {
    return {
        async invitationSignUp(
            request,
            context,
        ) {
            return await input
                .invitationSignUpUseCase
                .execute(
                    request,
                    context,
                );
        },

        async verifyEmail(
            request,
            context,
        ) {
            return await input
                .verifyEmailUseCase
                .execute(
                    request,
                    context,
                );
        },

        async signIn(
            request,
            context,
        ) {
            return await input
                .signInUseCase
                .execute(
                    request,
                    context,
                );
        },

        async signOut(
            request,
            context,
        ) {
            return await input
                .signOutUseCase
                .execute(
                    request,
                    context,
                );
        },

        async getCurrentSession(
            request,
            context,
        ) {
            return await input
                .currentSessionUseCase
                .execute(
                    request,
                    context,
                );
        },

        async getCurrentUser(
            request,
            context,
        ) {
            return await input
                .currentUserUseCase
                .execute(
                    request,
                    context,
                );
        },

        async requestPasswordReset(
            request,
            context,
        ) {
            return await input
                .requestPasswordResetUseCase
                .execute(
                    request,
                    context,
                );
        },

        async resetPassword(
            request,
            context,
        ) {
            return await input
                .resetPasswordUseCase
                .execute(
                    request,
                    context,
                );
        },

        async changePassword(
            request,
            context,
        ) {
            return await input
                .changePasswordUseCase
                .execute(
                    request,
                    context,
                );
        },

        async getIdentityForTenantAdministration(
            userId,
            context,
            security,
        ) {
            const user = await input.getIdentityForTenantAdministrationUseCase.execute(
                { userId }, context, security,
            );
            return { ...user };
        },

        async getIdentitySecuritySummary(userId, context, security) {
            return await input.getIdentitySecuritySummaryUseCase.execute(userId, context, security);
        },

        async getIdentitySecurityHistory(userId, context, security) { return await input.getIdentitySecurityHistoryUseCase.execute(userId, context, security); },

        async listSessionsForProvider(userId, context, security) { return await input.providerSessionAdministrationUseCase.list(userId, context, security); },
        async getSessionForProvider(userId, sessionId, context, security) { return await input.providerSessionAdministrationUseCase.get(userId, sessionId, context, security); },
        async revokeSessionForProvider(userId, sessionId, context, security) { return await input.providerSessionAdministrationUseCase.revoke(userId, sessionId, context, security); },
        async revokeAllSessionsForProvider(userId, context, security) { return await input.providerSessionAdministrationUseCase.revokeAll(userId, context, security); },
        async initiateRecoveryForProvider(userId, context, security) { return await input.providerRecoveryInitiationUseCase.execute(userId, context, security); },
        async suspendIdentityForProvider(userId, context, security) { return await input.providerIdentityLifecycleUseCase.suspend(userId, context, security); },
        async reactivateIdentityForProvider(userId, context, security) { return await input.providerIdentityLifecycleUseCase.reactivate(userId, context, security); },

        async getIdentityForProvider(
            userId,
            context,
            security,
        ) {
            const user = await input.getIdentityForProviderUseCase.execute({ userId }, context, security);
            return { ...user };
        },

        async listIdentitiesForProvider(
            request,
            context,
            security,
        ) {
            const result = await input.listIdentitiesForProviderUseCase.execute(request, context, security);
            return { items: result.users.map(user => ({ ...user })), total: result.total, offset: request.offset, limit: request.limit };
        },
    };
}