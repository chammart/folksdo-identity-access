// services/identity/src/adapters/better-auth/better-auth-identity-adapter.ts
// -----------------------------------------------------------------------------
// BETTERAUTH IDENTITY ADAPTER
// -----------------------------------------------------------------------------
// Single Identity-owned adapter around BetterAuth.
//
// Purpose:
//   • keep BetterAuth hidden from use cases
//   • use BetterAuth for auth user/account/session/email verification
//   • avoid custom password, session, and token mechanics
//   • translate provider-confirmed credential lifecycle operations into
//     Identity-owned terms
//
// Only this adapter may depend on the BetterAuth runtime shape.
// -----------------------------------------------------------------------------

import {
    InvalidAuthenticationCredentialsError,
    InvalidCurrentPasswordError,
    InvalidPasswordResetTokenError,
    InvalidSignupStateError,
    InvalidVerificationTokenError,
    PasswordChangeFailedError,
    PasswordResetRequestFailedError,
} from "../../errors";

import type {
    BetterAuthPasswordResetConfirmation,
} from "./create-better-auth-runtime";

// -----------------------------------------------------------------------------
// ADAPTER CONTRACT
// -----------------------------------------------------------------------------

export interface BetterAuthIdentityAdapter {
    prepareInvitationSignUp(
        input:
            PrepareBetterAuthInvitationSignUpInput,
    ): Promise<PreparedBetterAuthInvitationSignUp>;

    verifyEmail(
        input:
            VerifyBetterAuthEmailInput,
    ): Promise<VerifiedBetterAuthEmail>;

    signIn(
        input:
            SignInBetterAuthInput,
    ): Promise<SignedInBetterAuth>;

    signOut(
        input:
            SignOutBetterAuthInput,
    ): Promise<SignedOutBetterAuth>;

    requestPasswordReset(
        input:
            RequestBetterAuthPasswordResetInput,
    ): Promise<RequestedBetterAuthPasswordReset>;

    resetPassword(
        input:
            ResetBetterAuthPasswordInput,
    ): Promise<ResetBetterAuthPassword>;

    changePassword(
        input:
            ChangeBetterAuthPasswordInput,
    ): Promise<ChangedBetterAuthPassword>;
}

// -----------------------------------------------------------------------------
// INVITATION SIGNUP
// -----------------------------------------------------------------------------

export interface PrepareBetterAuthInvitationSignUpInput {
    readonly userId:
    string;

    readonly email:
    string;

    readonly password:
    string;

    readonly sessionId:
    string;

    readonly verificationId:
    string;
}

export interface PreparedBetterAuthInvitationSignUp {
    readonly provider:
    "better-auth";

    readonly providerUserId:
    string;

    readonly providerCredentialId:
    string;

    readonly providerSessionId:
    string;

    readonly providerVerificationId?:
    string;
}

// -----------------------------------------------------------------------------
// SIGN IN
// -----------------------------------------------------------------------------

export interface SignInBetterAuthInput {
    readonly email:
    string;

    readonly password:
    string;

    readonly sessionId:
    string;
}

export interface SignedInBetterAuth {
    readonly provider:
    "better-auth";

    readonly providerUserId:
    string;

    readonly providerSessionId:
    string;

    readonly email:
    string;
}

// -----------------------------------------------------------------------------
// SIGN OUT
// -----------------------------------------------------------------------------

export interface SignOutBetterAuthInput {
    readonly sessionId:
    string;

    readonly providerSessionId:
    string;

    readonly userId:
    string;
}

export interface SignedOutBetterAuth {
    readonly provider:
    "better-auth";

    readonly revokedAt:
    string;
}

// -----------------------------------------------------------------------------
// PASSWORD RESET REQUEST
// -----------------------------------------------------------------------------

export interface RequestBetterAuthPasswordResetInput {
    readonly email:
    string;
}

export interface RequestedBetterAuthPasswordReset {
    readonly provider:
    "better-auth";

    readonly requestedAt:
    string;
}

// -----------------------------------------------------------------------------
// PASSWORD RESET
// -----------------------------------------------------------------------------

export interface ResetBetterAuthPasswordInput {
    readonly token:
    string;

    readonly newPassword:
    string;
}

export interface ResetBetterAuthPassword {
    readonly provider:
    "better-auth";

    readonly userId:
    string;

    readonly updatedAt:
    string;
}

// -----------------------------------------------------------------------------
// PASSWORD CHANGE
// -----------------------------------------------------------------------------

export interface ChangeBetterAuthPasswordInput {
    /**
     * Canonical Identity user ID that owns the credential.
     *
     * This identifier belongs to the Folksdo Identity namespace and must never
     * be compared directly with BetterAuth's provider user identifier.
     */
    readonly userId:
    string;

    readonly email:
    string;

    readonly currentPassword:
    string;

    readonly newPassword:
    string;

    readonly revokeOtherSessions:
    boolean;
}

export interface ChangedBetterAuthPassword {
    readonly provider:
    "better-auth";

    readonly userId:
    string;

    readonly updatedAt:
    string;

    readonly otherSessionsRevoked:
    boolean;
}

// -----------------------------------------------------------------------------
// VERIFY EMAIL
// -----------------------------------------------------------------------------

export interface VerifyBetterAuthEmailInput {
    readonly verificationToken:
    string;
}

export interface VerifiedBetterAuthEmail {
    readonly provider:
    "better-auth";

    readonly verifiedAt:
    string;
}

// -----------------------------------------------------------------------------
// BETTERAUTH RUNTIME CONTRACT
// -----------------------------------------------------------------------------

export interface BetterAuthRuntimeLike {
    readonly api: {
        signUpEmail(
            input: {
                readonly returnHeaders:
                true;

                readonly body: {
                    readonly email:
                    string;

                    readonly password:
                    string;

                    readonly name:
                    string;
                };
            },
        ): Promise<BetterAuthAuthResult>;

        signInEmail(
            input: {
                readonly returnHeaders:
                true;

                readonly body: {
                    readonly email:
                    string;

                    readonly password:
                    string;
                };
            },
        ): Promise<BetterAuthAuthResult>;

        signOut(
            input: {
                readonly body?:
                undefined;

                readonly method?:
                "POST";

                readonly headers:
                HeadersInit;
            },
        ): Promise<unknown>;

        verifyEmail(
            input: {
                readonly query: {
                    readonly token:
                    string;
                };
            },
        ): Promise<unknown>;

        requestPasswordReset?(
            input: {
                readonly body: {
                    readonly email:
                    string;
                };
            },
        ): Promise<unknown>;

        resetPassword?(
            input: {
                readonly body: {
                    readonly token:
                    string;

                    readonly newPassword:
                    string;
                };
            },
        ): Promise<BetterAuthPasswordResetConfirmation>;

        changePassword?(
            input: {
                readonly body: {
                    readonly currentPassword:
                    string;

                    readonly newPassword:
                    string;

                    readonly revokeOtherSessions:
                    boolean;
                };

                readonly headers:
                HeadersInit;
            },
        ): Promise<unknown>;
    };
}

export interface BetterAuthAuthResult {
    readonly response: {
        readonly user: {
            readonly id:
            string;

            readonly email?:
            string;
        };

        readonly token?:
        string | null;
    };

    readonly headers:
    Headers;
}

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateBetterAuthIdentityAdapterInput {
    readonly auth:
    BetterAuthRuntimeLike;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createBetterAuthIdentityAdapter(
    input:
        CreateBetterAuthIdentityAdapterInput,
): BetterAuthIdentityAdapter {
    return {
        async prepareInvitationSignUp(
            authInput:
                PrepareBetterAuthInvitationSignUpInput,
        ): Promise<PreparedBetterAuthInvitationSignUp> {
            if (
                !authInput.password.trim()
            ) {
                throw new InvalidSignupStateError(
                    "Password is required.",
                );
            }

            const result =
                await signUpOrSignIn({
                    auth:
                        input.auth,

                    authInput,
                });

            return {
                provider:
                    "better-auth",

                providerUserId:
                    result.response.user.id,

                providerCredentialId:
                    `better-auth:credential:${result.response.user.id}`,

                providerSessionId:
                    createProviderSessionId({
                        userId:
                            result.response.user.id,

                        token:
                            result.response.token,

                        fallbackSessionId:
                            authInput.sessionId,
                    }),

                providerVerificationId:
                    authInput.verificationId,
            };
        },

        async signIn(
            authInput:
                SignInBetterAuthInput,
        ): Promise<SignedInBetterAuth> {
            if (
                !authInput.password.trim()
            ) {
                throw new InvalidAuthenticationCredentialsError();
            }

            try {
                const result =
                    await input.auth.api.signInEmail({
                        returnHeaders:
                            true,

                        body: {
                            email:
                                authInput.email,

                            password:
                                authInput.password,
                        },
                    });

                return {
                    provider:
                        "better-auth",

                    providerUserId:
                        result.response.user.id,

                    providerSessionId:
                        createSafeProviderSessionId({
                            userId:
                                result.response.user.id,

                            fallbackSessionId:
                                authInput.sessionId,
                        }),

                    email:
                        result.response.user.email
                        ?? authInput.email,
                };
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new InvalidAuthenticationCredentialsError();
                }

                throw error;
            }
        },

        async signOut(
            authInput:
                SignOutBetterAuthInput,
        ): Promise<SignedOutBetterAuth> {
            if (
                !authInput.sessionId.trim()
            ) {
                throw new InvalidAuthenticationCredentialsError();
            }

            try {
                await input.auth.api.signOut({
                    body:
                        undefined,

                    method:
                        "POST",

                    headers:
                        new Headers(),
                });
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new InvalidAuthenticationCredentialsError();
                }

                throw error;
            }

            return {
                provider:
                    "better-auth",

                revokedAt:
                    new Date()
                        .toISOString(),
            };
        },

        async requestPasswordReset(
            authInput:
                RequestBetterAuthPasswordResetInput,
        ): Promise<RequestedBetterAuthPasswordReset> {
            try {
                if (
                    typeof input.auth.api.requestPasswordReset ===
                    "function"
                ) {
                    await input.auth.api.requestPasswordReset({
                        body: {
                            email:
                                authInput.email,
                        },
                    });
                }

                return {
                    provider:
                        "better-auth",

                    requestedAt:
                        new Date()
                            .toISOString(),
                };
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new PasswordResetRequestFailedError();
                }

                throw error;
            }
        },

        async resetPassword(
            authInput:
                ResetBetterAuthPasswordInput,
        ): Promise<ResetBetterAuthPassword> {
            if (
                typeof input.auth.api.resetPassword !==
                "function"
            ) {
                throw new InvalidPasswordResetTokenError();
            }

            try {
                const confirmation =
                    await input.auth.api.resetPassword({
                        body: {
                            token:
                                authInput.token,

                            newPassword:
                                authInput.newPassword,
                        },
                    });

                assertPasswordResetConfirmation(
                    confirmation,
                );

                return {
                    provider:
                        "better-auth",

                    userId:
                        confirmation.providerUserId,

                    updatedAt:
                        confirmation.confirmedAt,
                };
            } catch (
            error
            ) {
                if (
                    error instanceof
                    InvalidPasswordResetTokenError
                ) {
                    throw error;
                }

                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new InvalidPasswordResetTokenError();
                }

                throw error;
            }
        },

        async changePassword(
            authInput:
                ChangeBetterAuthPasswordInput,
        ): Promise<ChangedBetterAuthPassword> {
            if (
                typeof input.auth.api.changePassword !==
                "function"
            ) {
                throw new PasswordChangeFailedError();
            }

            const userId =
                normalizeRequiredValue(
                    authInput.userId,
                );

            const email =
                normalizeRequiredValue(
                    authInput.email,
                );

            if (
                userId ===
                undefined
                || email ===
                undefined
                || !authInput.currentPassword.trim()
            ) {
                throw new InvalidCurrentPasswordError();
            }

            let authenticated:
                BetterAuthAuthResult;

            try {
                authenticated =
                    await input.auth.api.signInEmail({
                        returnHeaders:
                            true,

                        body: {
                            email,

                            password:
                                authInput.currentPassword,
                        },
                    });
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new InvalidCurrentPasswordError();
                }

                throw error;
            }

            const providerUserId =
                normalizeRequiredValue(
                    authenticated.response.user.id,
                );

            if (
                providerUserId ===
                undefined
            ) {
                await revokeTemporaryProviderSession({
                    auth:
                        input.auth,

                    authenticated,
                });

                throw new InvalidCurrentPasswordError();
            }

            const authenticationHeaders =
                createAuthenticatedProviderHeaders(
                    authenticated,
                );

            try {
                await input.auth.api.changePassword({
                    body: {
                        currentPassword:
                            authInput.currentPassword,

                        newPassword:
                            authInput.newPassword,

                        revokeOtherSessions:
                            authInput.revokeOtherSessions,
                    },

                    headers:
                        authenticationHeaders,
                });
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new PasswordChangeFailedError();
                }

                throw error;
            } finally {
                await revokeTemporaryProviderSession({
                    auth:
                        input.auth,

                    authenticated,

                    headers:
                        authenticationHeaders,
                });
            }

            return {
                provider:
                    "better-auth",

                userId:
                    userId,

                updatedAt:
                    new Date()
                        .toISOString(),

                otherSessionsRevoked:
                    authInput.revokeOtherSessions,
            };
        },

        async verifyEmail(
            authInput:
                VerifyBetterAuthEmailInput,
        ): Promise<VerifiedBetterAuthEmail> {
            try {
                await input.auth.api.verifyEmail({
                    query: {
                        token:
                            authInput.verificationToken,
                    },
                });

                return {
                    provider:
                        "better-auth",

                    verifiedAt:
                        new Date()
                            .toISOString(),
                };
            } catch (
            error
            ) {
                if (
                    isProviderApiError(
                        error,
                    )
                ) {
                    throw new InvalidVerificationTokenError();
                }

                throw error;
            }
        },
    };
}

// -----------------------------------------------------------------------------
// PASSWORD RESET CONFIRMATION
// -----------------------------------------------------------------------------

function assertPasswordResetConfirmation(
    confirmation:
        BetterAuthPasswordResetConfirmation,
): void {
    if (
        typeof confirmation.providerUserId !==
        "string"
        || confirmation.providerUserId.trim().length ===
        0
    ) {
        throw new InvalidPasswordResetTokenError();
    }

    if (
        typeof confirmation.email !==
        "string"
        || confirmation.email.trim().length ===
        0
    ) {
        throw new InvalidPasswordResetTokenError();
    }

    if (
        typeof confirmation.confirmedAt !==
        "string"
        || confirmation.confirmedAt.trim().length ===
        0
        || Number.isNaN(
            Date.parse(
                confirmation.confirmedAt,
            ),
        )
    ) {
        throw new InvalidPasswordResetTokenError();
    }
}

// -----------------------------------------------------------------------------
// PASSWORD CHANGE AUTHENTICATION
// -----------------------------------------------------------------------------

function createAuthenticatedProviderHeaders(
    authenticated:
        BetterAuthAuthResult,
): Headers {
    const cookieValues =
        readSetCookieValues(
            authenticated.headers,
        );

    const cookieHeader =
        cookieValues
            .map(
                extractCookiePair,
            )
            .filter(
                (
                    value,
                ): value is string =>
                    value !==
                    undefined,
            )
            .join(
                "; ",
            );

    if (
        cookieHeader.length ===
        0
    ) {
        throw new PasswordChangeFailedError();
    }

    const headers =
        new Headers();

    headers.set(
        "cookie",
        cookieHeader,
    );

    return headers;
}

function readSetCookieValues(
    headers:
        Headers,
): readonly string[] {
    const extendedHeaders =
        headers as Headers & {
            getSetCookie?():
                string[];
        };

    if (
        typeof extendedHeaders.getSetCookie ===
        "function"
    ) {
        const values =
            extendedHeaders.getSetCookie();

        if (
            values.length >
            0
        ) {
            return values;
        }
    }

    const combined =
        headers.get(
            "set-cookie",
        );

    if (
        combined ===
        null
        || combined.trim().length ===
        0
    ) {
        return [];
    }

    return [
        combined,
    ];
}

function extractCookiePair(
    setCookie:
        string,
): string | undefined {
    const pair =
        setCookie
            .split(
                ";",
                1,
            )[0]
            ?.trim();

    if (
        pair ===
        undefined
        || pair.length ===
        0
        || !pair.includes(
            "=",
        )
    ) {
        return undefined;
    }

    return pair;
}

async function revokeTemporaryProviderSession(
    input: {
        readonly auth:
        BetterAuthRuntimeLike;

        readonly authenticated:
        BetterAuthAuthResult;

        readonly headers?:
        Headers;
    },
): Promise<void> {
    try {
        const headers =
            input.headers
            ?? createAuthenticatedProviderHeaders(
                input.authenticated,
            );

        await input.auth.api.signOut({
            body:
                undefined,

            method:
                "POST",

            headers,
        });
    } catch {
        // Best-effort cleanup only.
        //
        // The temporary provider session is never returned to the caller and
        // cleanup failure must not replace the authoritative password-change
        // result or provider error.
    }
}

// -----------------------------------------------------------------------------
// SIGNUP FALLBACK
// -----------------------------------------------------------------------------

async function signUpOrSignIn(
    input: {
        readonly auth:
        BetterAuthRuntimeLike;

        readonly authInput:
        PrepareBetterAuthInvitationSignUpInput;
    },
): Promise<BetterAuthAuthResult> {
    try {
        return await input.auth.api.signUpEmail({
            returnHeaders:
                true,

            body: {
                email:
                    input.authInput.email,

                password:
                    input.authInput.password,

                name:
                    input.authInput.email,
            },
        });
    } catch (
    error
    ) {
        if (
            !isProviderApiError(
                error,
            )
        ) {
            throw error;
        }

        return await input.auth.api.signInEmail({
            returnHeaders:
                true,

            body: {
                email:
                    input.authInput.email,

                password:
                    input.authInput.password,
            },
        });
    }
}

// -----------------------------------------------------------------------------
// SESSION IDENTIFIERS
// -----------------------------------------------------------------------------

function createSafeProviderSessionId(
    input: {
        readonly userId:
        string;

        readonly fallbackSessionId:
        string;
    },
): string {
    return `better-auth:session:${input.userId}:${input.fallbackSessionId}`;
}

function createProviderSessionId(
    input: {
        readonly userId:
        string;

        readonly token?:
        string | null;

        readonly fallbackSessionId:
        string;
    },
): string {
    if (
        input.token
    ) {
        return `better-auth:session:${input.userId}:${input.token}`;
    }

    return `better-auth:session:${input.userId}:${input.fallbackSessionId}`;
}

// -----------------------------------------------------------------------------
// VALUE NORMALIZATION
// -----------------------------------------------------------------------------

function normalizeRequiredValue(
    value:
        unknown,
): string | undefined {
    if (
        typeof value !==
        "string"
    ) {
        return undefined;
    }

    const normalized =
        value.trim();

    return normalized.length >
        0
        ? normalized
        : undefined;
}

// -----------------------------------------------------------------------------
// PROVIDER ERROR CLASSIFICATION
// -----------------------------------------------------------------------------

function isProviderApiError(
    error:
        unknown,
): boolean {
    if (
        error ===
        null
        || typeof error !==
        "object"
    ) {
        return false;
    }

    const candidate =
        error as {
            readonly name?:
            unknown;

            readonly status?:
            unknown;

            readonly statusCode?:
            unknown;

            readonly body?:
            unknown;
        };

    return (
        candidate.name ===
        "APIError"
        || typeof candidate.status ===
        "number"
        || typeof candidate.statusCode ===
        "number"
        || candidate.body !==
        undefined
    );
}