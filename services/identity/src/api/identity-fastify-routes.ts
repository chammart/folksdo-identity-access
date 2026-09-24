// services/identity/src/api/identity-fastify-routes.ts
// -----------------------------------------------------------------------------
// IDENTITY FASTIFY ROUTES
// -----------------------------------------------------------------------------
// Fastify route adapters for Identity Service™.
//
// Purpose:
//   • expose Identity HTTP endpoints
//   • validate transport requests
//   • resolve RuntimeContext
//   • call IdentityApi only
//   • translate semantic errors into HTTP responses
//
// Architectural rules:
//
//   • Routes are transport adapters only
//   • Routes never call use cases directly
//   • Routes never contain business logic
//   • Identity session authentication uses Authorization: Bearer only
//   • Unexpected failures must be logged before translation
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
} from "fastify";

import {
    InvalidAuthenticationCredentialsError,
} from "../errors";

import type {
    IdentityApi,
} from "./identity-api";

import type {
    IdentityAuthenticatedRouteContextResolver,
    IdentityProviderReadSecurityResolver,
    IdentityRouteContextResolver,
} from "./identity-route-context";

import {
    translateIdentityHttpError,
} from "./identity-http-error-translator";

import {
    parseChangePasswordRequest,
    parseCurrentSessionRequest,
    parseCurrentUserRequest,
    parseInvitationSignUpRequest,
    parseRequestPasswordResetRequest,
    parseResetPasswordRequest,
    parseSignInRequest,
    parseSignOutRequest,
    parseVerifyEmailRequest,
    parseProviderIdentityListRequest,
    parseProviderIdentityParams,
} from "./identity-route-validation";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface RegisterIdentityRoutesInput {
    readonly app:
    FastifyInstance;

    readonly identityApi:
    IdentityApi;

    readonly contextResolver:
    IdentityRouteContextResolver;

    readonly authenticatedContextResolver:
    IdentityAuthenticatedRouteContextResolver;

    readonly providerReadSecurityResolver:
    IdentityProviderReadSecurityResolver;
}

// -----------------------------------------------------------------------------
// ROUTE REGISTRATION
// -----------------------------------------------------------------------------

export async function registerIdentityRoutes(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    await registerInvitationSignUpRoute(
        input,
    );

    await registerVerifyEmailRoute(
        input,
    );

    await registerSignInRoute(
        input,
    );

    await registerSignOutRoute(
        input,
    );

    await registerCurrentSessionRoute(
        input,
    );

    await registerCurrentUserRoute(
        input,
    );

    await registerRequestPasswordResetRoute(
        input,
    );

    await registerResetPasswordRoute(
        input,
    );

    await registerChangePasswordRoute(
        input,
    );

    await registerProviderIdentityListRoute(
        input,
    );

    await registerProviderIdentityGetRoute(
        input,
    );
}

// -----------------------------------------------------------------------------
// INVITATION SIGNUP ROUTE
// -----------------------------------------------------------------------------

async function registerInvitationSignUpRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/invitation-sign-up",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseInvitationSignUpRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .invitationSignUp(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        201,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.invitation-sign-up",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity invitation signup failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// VERIFY EMAIL ROUTE
// -----------------------------------------------------------------------------

async function registerVerifyEmailRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/verify-email",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseVerifyEmailRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .verifyEmail(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.verify-email",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity verify email failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// SIGN IN ROUTE
// -----------------------------------------------------------------------------

async function registerSignInRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/sign-in",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseSignInRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .signIn(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.sign-in",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity sign in failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// SIGN OUT ROUTE
// -----------------------------------------------------------------------------

async function registerSignOutRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/sign-out",
        async (
            request,
            reply,
        ) => {
            try {
                const authenticated =
                    await input
                        .authenticatedContextResolver
                        .resolveAuthenticatedSession({
                            request,
                            reply,
                        });

                const body =
                    parseSignOutRequest(
                        request.body,
                    );

                assertSignOutSessionOwnership({
                    requestedSessionId:
                        body.sessionId,

                    authenticatedSessionId:
                        authenticated.sessionId,
                });

                const result =
                    await input
                        .identityApi
                        .signOut(
                            {
                                sessionId:
                                    authenticated.sessionId,
                            },
                            authenticated.context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.sign-out",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity sign out failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// CURRENT SESSION ROUTE
// -----------------------------------------------------------------------------

async function registerCurrentSessionRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.get(
        "/api/v1/identity/session",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseCurrentSessionRequest(
                        resolveSessionReference(
                            request,
                        ),
                    );

                const result =
                    await input
                        .identityApi
                        .getCurrentSession(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.current-session",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity current session failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// CURRENT USER ROUTE
// -----------------------------------------------------------------------------

async function registerCurrentUserRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.get(
        "/api/v1/identity/me",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseCurrentUserRequest(
                        resolveSessionReference(
                            request,
                        ),
                    );

                const result =
                    await input
                        .identityApi
                        .getCurrentUser(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.current-user",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity current user failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// REQUEST PASSWORD RESET ROUTE
// -----------------------------------------------------------------------------

async function registerRequestPasswordResetRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/request-password-reset",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseRequestPasswordResetRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .requestPasswordReset(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.request-password-reset",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity request password reset failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// RESET PASSWORD ROUTE
// -----------------------------------------------------------------------------

async function registerResetPasswordRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/reset-password",
        async (
            request,
            reply,
        ) => {
            try {
                const context =
                    await input
                        .contextResolver
                        .resolve({
                            request,
                            reply,
                        });

                const body =
                    parseResetPasswordRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .resetPassword(
                            body,
                            context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.reset-password",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity reset password failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// CHANGE PASSWORD ROUTE
// -----------------------------------------------------------------------------
// Authenticated credential maintenance.
//
// Security:
//
//   • requires the canonical Authorization Bearer session
//   • authenticated Identity is derived from trusted RuntimeContext
//   • request body never selects userId or sessionId
//   • passwords are passed only to the Identity API
//   • passwords are never logged or returned
// -----------------------------------------------------------------------------

async function registerChangePasswordRoute(
    input:
        RegisterIdentityRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/identity/change-password",
        async (
            request,
            reply,
        ) => {
            try {
                const authenticated =
                    await input
                        .authenticatedContextResolver
                        .resolveAuthenticatedSession({
                            request,
                            reply,
                        });

                const body =
                    parseChangePasswordRequest(
                        request.body,
                    );

                const result =
                    await input
                        .identityApi
                        .changePassword(
                            body,
                            authenticated.context,
                        );

                return await reply
                    .status(
                        200,
                    )
                    .send(
                        result,
                    );
            } catch (
            error
            ) {
                request.log.error(
                    {
                        route:
                            "identity.change-password",

                        error:
                            serializeError(
                                error,
                            ),
                    },
                    "Identity change password failed.",
                );

                const translated =
                    translateIdentityHttpError(
                        error,
                    );

                return await reply
                    .status(
                        translated.statusCode,
                    )
                    .send(
                        translated.body,
                    );
            }
        },
    );
}

// -----------------------------------------------------------------------------
// SESSION REFERENCE
// -----------------------------------------------------------------------------
// Resolves the canonical Identity session reference.
//
// Security:
//
//   • only Authorization: Bearer <session-id> is supported
//   • query-string session references are rejected
//   • x-identity-session-id is rejected
//   • x-session-id is rejected
//   • malformed Authorization values are treated as missing authentication
// -----------------------------------------------------------------------------

function resolveSessionReference(
    request: {
        readonly headers:
        Record<
            string,
            string
            | string[]
            | undefined
        >;
    },
): unknown {
    return resolveBearerSessionId(
        request.headers.authorization,
    );
}

function resolveBearerSessionId(
    authorization:
        string
        | string[]
        | undefined,
): string | undefined {
    if (
        typeof authorization !==
        "string"
    ) {
        return undefined;
    }

    const match =
        /^Bearer\s+(.+)$/i.exec(
            authorization.trim(),
        );

    const sessionId =
        match?.[1]
            ?.trim();

    if (
        sessionId ===
        undefined
        || sessionId.length ===
        0
    ) {
        return undefined;
    }

    return sessionId;
}

// -----------------------------------------------------------------------------
// SIGN OUT OWNERSHIP
// -----------------------------------------------------------------------------

function assertSignOutSessionOwnership(
    input: {
        readonly requestedSessionId:
        string;

        readonly authenticatedSessionId:
        string;
    },
): void {
    const requestedSessionId =
        input.requestedSessionId.trim();

    const authenticatedSessionId =
        input.authenticatedSessionId.trim();

    if (
        requestedSessionId.length ===
        0
        || authenticatedSessionId.length ===
        0
        || requestedSessionId !==
        authenticatedSessionId
    ) {
        throw new InvalidAuthenticationCredentialsError();
    }
}

// -----------------------------------------------------------------------------
// LOGGING HELPERS
// -----------------------------------------------------------------------------

function serializeError(
    error:
        unknown,
): unknown {
    if (
        !(
            error instanceof
            Error
        )
    ) {
        return error;
    }

    return {
        name:
            error.name,

        message:
            error.message,

        stack:
            error.stack,

        cause:
            "cause" in error
                ? serializeError(
                    error.cause,
                )
                : undefined,
    };
}

// -----------------------------------------------------------------------------
// PROVIDER IDENTITY READ ROUTES
// -----------------------------------------------------------------------------

async function registerProviderIdentityListRoute(input: RegisterIdentityRoutesInput): Promise<void> {
    input.app.get("/api/v1/identities", async (request, reply) => {
        try {
            const query = parseProviderIdentityListRequest(request.query);
            const resolved = await input.providerReadSecurityResolver.resolvePlatform({ request, reply });
            return await input.identityApi.listIdentitiesForProvider(query, resolved.context, resolved.security);
        } catch (error) {
            request.log.error({ route: "identity.provider-list", error: serializeError(error) }, "Provider Identity list failed.");
            const translated = translateIdentityHttpError(error);
            return await reply.status(translated.statusCode).send(translated.body);
        }
    });
}

async function registerProviderIdentityGetRoute(input: RegisterIdentityRoutesInput): Promise<void> {
    input.app.get("/api/v1/identities/:userId", async (request, reply) => {
        try {
            const params = parseProviderIdentityParams(request.params);
            const resolved = await input.providerReadSecurityResolver.resolvePlatform({ request, reply });
            return await input.identityApi.getIdentityForProvider(params.userId, resolved.context, resolved.security);
        } catch (error) {
            request.log.error({ route: "identity.provider-get", error: serializeError(error) }, "Provider Identity get failed.");
            const translated = translateIdentityHttpError(error);
            return await reply.status(translated.statusCode).send(translated.body);
        }
    });
}
