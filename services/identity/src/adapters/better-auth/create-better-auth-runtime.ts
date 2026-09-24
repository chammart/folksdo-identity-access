// services/identity/src/adapters/better-auth/create-better-auth-runtime.ts
// -----------------------------------------------------------------------------
// CREATE BETTERAUTH RUNTIME
// -----------------------------------------------------------------------------
// Production BetterAuth runtime factory for Identity Service™.
//
// Important:
//   • this file imports BetterAuth directly
//   • use cases and routes must never import BetterAuth
//   • password-reset identity confirmation remains inside the provider adapter
//   • successful password reset revokes all BetterAuth provider sessions
//
// Password-reset confirmation:
//
//   Identity adapter
//          ↓
//   BetterAuth resetPassword
//          ↓
//   BetterAuth validates token and changes password
//          ↓
//   BetterAuth revokes existing provider sessions
//          ↓
//   onPasswordReset receives the confirmed provider user
//          ↓
//   wrapped resetPassword returns the confirmed provider identity
//
// AsyncLocalStorage correlates the callback with the exact reset operation.
// This avoids global mutable state and remains safe across concurrent requests.
// -----------------------------------------------------------------------------

import {
    AsyncLocalStorage,
} from "node:async_hooks";

import {
    betterAuth,
} from "better-auth";

import {
    mongodbAdapter,
} from "better-auth/adapters/mongodb";

import type {
    Db,
} from "mongodb";

// -----------------------------------------------------------------------------
// RUNTIME INPUT
// -----------------------------------------------------------------------------

export interface CreateBetterAuthRuntimeInput {
    readonly database:
    Db;

    readonly baseUrl:
    string;

    readonly trustedOrigins:
    readonly string[];

    readonly secret:
    string;

    readonly sendVerificationEmail:
    SendBetterAuthVerificationEmail;

    readonly sendResetPassword:
    SendBetterAuthResetPassword;
}

// -----------------------------------------------------------------------------
// EMAIL SENDERS
// -----------------------------------------------------------------------------

export interface SendBetterAuthResetPassword {
    send(
        input:
            SendBetterAuthResetPasswordInput,
    ): Promise<void>;
}

export interface SendBetterAuthResetPasswordInput {
    readonly email:
    string;

    readonly url:
    string;

    readonly token:
    string;
}

export interface SendBetterAuthVerificationEmail {
    send(
        input:
            SendBetterAuthVerificationEmailInput,
    ): Promise<void>;
}

export interface SendBetterAuthVerificationEmailInput {
    readonly email:
    string;

    readonly url:
    string;

    readonly token:
    string;
}

// -----------------------------------------------------------------------------
// PASSWORD RESET CONFIRMATION
// -----------------------------------------------------------------------------

export interface BetterAuthPasswordResetConfirmation {
    readonly providerUserId:
    string;

    readonly email:
    string;

    readonly confirmedAt:
    string;
}

interface MutablePasswordResetContext {
    confirmation?:
    BetterAuthPasswordResetConfirmation;
}

interface BetterAuthPasswordResetUser {
    readonly id:
    string;

    readonly email:
    string;
}

// -----------------------------------------------------------------------------
// RUNTIME CONTRACT
// -----------------------------------------------------------------------------

type BetterAuthCoreRuntime =
    ReturnType<typeof betterAuth>;

type BetterAuthResetPasswordInput =
    Parameters<
        BetterAuthCoreRuntime["api"]["resetPassword"]
    >[0];

export type BetterAuthRuntime =
    Omit<
        BetterAuthCoreRuntime,
        "api"
    >
    & {
        readonly api:
        Omit<
            BetterAuthCoreRuntime["api"],
            "resetPassword"
        >
        & {
            resetPassword(
                input:
                    BetterAuthResetPasswordInput,
            ): Promise<BetterAuthPasswordResetConfirmation>;
        };
    };

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createBetterAuthRuntime(
    input:
        CreateBetterAuthRuntimeInput,
): BetterAuthRuntime {
    const passwordResetContext =
        new AsyncLocalStorage<MutablePasswordResetContext>();

    const auth =
        betterAuth({
            database:
                mongodbAdapter(
                    input.database,
                ),

            baseURL:
                input.baseUrl,

            trustedOrigins:
                [
                    ...input.trustedOrigins,
                ],

            secret:
                input.secret,

            emailAndPassword: {
                enabled:
                    true,

                requireEmailVerification:
                    true,

                /**
                 * Password reset is an account-recovery operation.
                 *
                 * Every existing BetterAuth provider session is invalidated
                 * after the password is successfully replaced.
                 *
                 * Identity-owned session state is revoked separately by the
                 * Reset Password™ use case so both provider and canonical
                 * session lifecycle state remain synchronized.
                 */
                revokeSessionsOnPasswordReset:
                    true,

                async sendResetPassword(
                    {
                        user,
                        url,
                        token,
                    },
                ): Promise<void> {
                    await input
                        .sendResetPassword
                        .send({
                            email:
                                user.email,

                            url,

                            token,
                        });
                },

                async onPasswordReset(
                    {
                        user,
                    }: {
                        readonly user:
                        BetterAuthPasswordResetUser;
                    },
                ): Promise<void> {
                    const context =
                        passwordResetContext.getStore();

                    if (
                        context ===
                        undefined
                    ) {
                        throw new Error(
                            [
                                "BetterAuth password-reset confirmation",
                                "was produced outside an active reset context.",
                            ].join(
                                " ",
                            ),
                        );
                    }

                    context.confirmation = {
                        providerUserId:
                            user.id,

                        email:
                            user.email
                                .trim()
                                .toLowerCase(),

                        confirmedAt:
                            new Date()
                                .toISOString(),
                    };
                },
            },

            emailVerification: {
                sendOnSignUp:
                    true,

                autoSignInAfterVerification:
                    false,

                async sendVerificationEmail(
                    {
                        user,
                        url,
                        token,
                    },
                ): Promise<void> {
                    await input
                        .sendVerificationEmail
                        .send({
                            email:
                                user.email,

                            url,

                            token,
                        });
                },
            },

            advanced: {
                database: {
                    generateId:
                        false,
                },
            },
        });

    const resetPassword =
        auth.api.resetPassword.bind(
            auth.api,
        );

    const wrappedResetPassword =
        async (
            resetInput:
                BetterAuthResetPasswordInput,
        ): Promise<BetterAuthPasswordResetConfirmation> =>
            passwordResetContext.run(
                {},
                async () => {
                    const context =
                        passwordResetContext.getStore();

                    if (
                        context ===
                        undefined
                    ) {
                        throw new Error(
                            "BetterAuth password-reset context was not initialized.",
                        );
                    }

                    await resetPassword(
                        resetInput,
                    );

                    if (
                        context.confirmation ===
                        undefined
                    ) {
                        throw new Error(
                            [
                                "BetterAuth resetPassword completed without",
                                "a provider-confirmed password-reset user.",
                            ].join(
                                " ",
                            ),
                        );
                    }

                    return context.confirmation;
                },
            );

    return {
        ...auth,

        api: {
            ...auth.api,

            resetPassword:
                wrappedResetPassword,
        },
    } as BetterAuthRuntime;
}