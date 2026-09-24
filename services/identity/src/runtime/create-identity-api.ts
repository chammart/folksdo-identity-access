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