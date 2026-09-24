// apps/server/src/authentication/create-authenticated-identity-context-resolver.ts
// -----------------------------------------------------------------------------
// CREATE AUTHENTICATED IDENTITY CONTEXT RESOLVER
// -----------------------------------------------------------------------------
// Host-owned authentication adapter for protected Identity Operations™ routes.
//
// Purpose:
//   • resolve the canonical Identity session reference from the HTTP request
//   • validate the session through the public Identity API
//   • return the authenticated session ID together with RuntimeContext
//   • keep provider and persistence details outside route adapters
//
// Architectural rules:
//   • the host coordinates authentication across service boundaries
//   • Identity routes never read Identity persistence directly
//   • BetterAuth internals never cross the Identity public API boundary
//   • the authenticated session is never inferred from the request body
//   • Authorization: Bearer is the only accepted session transport
//   • Server imports Identity only through explicit package exports
//   • Server never imports services/identity/src directly
// -----------------------------------------------------------------------------

import type {
    FolksdoEngine,
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    IdentityApi,
    IdentityAuthenticatedRouteContext,
    IdentityAuthenticatedRouteContextResolver,
    IdentityRouteContextResolverInput,
} from "@folksdo-identity-access/identity/api";

import {
    AuthenticationSessionRequiredError,
    InvalidAuthenticationCredentialsError,
} from "@folksdo-identity-access/identity/errors";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const CONTROL_PLANE_TENANT_ID =
    "folksdo-control-plane";

const CONTROL_PLANE_TENANT_TYPE =
    "provider";

const AUTHENTICATION_ACTOR_ID =
    "iam-http-authenticator";

const AUTHENTICATION_ACTOR_TYPE =
    "system";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface CreateAuthenticatedIdentityContextResolverInput {
    readonly engine:
    FolksdoEngine;

    /**
     * Deferred getter avoids a bootstrap cycle.
     *
     * Identity routes require this resolver while IdentityApi is produced by
     * the same service bootstrap. Requests cannot execute until bootstrap has
     * completed and this getter has been bound to the runtime API.
     */
    readonly getIdentityApi:
    () => Pick<
        IdentityApi,
        "getCurrentSession"
    >;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAuthenticatedIdentityContextResolver(
    input:
        CreateAuthenticatedIdentityContextResolverInput,
): IdentityAuthenticatedRouteContextResolver {
    return {
        async resolve(
            resolverInput:
                IdentityRouteContextResolverInput,
        ): Promise<RuntimeContext> {
            const authenticated =
                await resolveAuthenticatedIdentityContext({
                    input,

                    resolverInput,
                });

            return authenticated.context;
        },

        async resolveAuthenticatedSession(
            resolverInput:
                IdentityRouteContextResolverInput,
        ): Promise<IdentityAuthenticatedRouteContext> {
            return await resolveAuthenticatedIdentityContext({
                input,

                resolverInput,
            });
        },
    };
}

// -----------------------------------------------------------------------------
// AUTHENTICATION
// -----------------------------------------------------------------------------

async function resolveAuthenticatedIdentityContext(
    input: {
        readonly input:
        CreateAuthenticatedIdentityContextResolverInput;

        readonly resolverInput:
        IdentityRouteContextResolverInput;
    },
): Promise<IdentityAuthenticatedRouteContext> {
    const sessionId =
        resolveIdentitySessionReference(
            input.resolverInput,
        );

    if (
        sessionId ===
        undefined
    ) {
        throw new AuthenticationSessionRequiredError();
    }

    const requestMetadata =
        resolveRequestMetadata(
            input.resolverInput,
        );

    let session:
        Awaited<
            ReturnType<
                IdentityApi["getCurrentSession"]
            >
        >;

    try {
        session =
            await input
                .input
                .getIdentityApi()
                .getCurrentSession(
                    {
                        sessionId,
                    },

                    createAuthenticationContext({
                        engine:
                            input.input.engine,

                        requestMetadata,
                    }),
                );
    } catch {
        throw new InvalidAuthenticationCredentialsError();
    }

    return {
        sessionId:
            session.sessionId,

        context:
            input.input.engine.context.create({
                requestId:
                    requestMetadata.requestId,

                correlationId:
                    requestMetadata.correlationId
                    ?? requestMetadata.requestId,

                causationId:
                    requestMetadata.causationId,

                actor: {
                    actorId:
                        session.userId,

                    actorType:
                        "user",
                },

                tenant: {
                    tenantId:
                        CONTROL_PLANE_TENANT_ID,

                    tenantType:
                        CONTROL_PLANE_TENANT_TYPE,
                },

                permissions:
                    [],
            }),
    };
}

// -----------------------------------------------------------------------------
// SESSION REFERENCE RESOLUTION
// -----------------------------------------------------------------------------
// Canonical transport:
//
//   Authorization: Bearer <identity-session-id>
//
// Security:
//
//   • x-identity-session-id is rejected
//   • x-session-id is rejected
//   • query-string session references are rejected
//   • malformed Authorization values are treated as missing authentication
// -----------------------------------------------------------------------------

function resolveIdentitySessionReference(
    input:
        IdentityRouteContextResolverInput,
): string | undefined {
    const authorization =
        firstHeaderValue(
            input.request.headers.authorization,
        );

    if (
        authorization ===
        undefined
    ) {
        return undefined;
    }

    const match =
        /^Bearer\s+(.+)$/i.exec(
            authorization.trim(),
        );

    return normalizeValue(
        match?.[1],
    );
}

// -----------------------------------------------------------------------------
// REQUEST METADATA
// -----------------------------------------------------------------------------

interface RequestMetadata {
    readonly requestId:
    string;

    readonly correlationId?:
    string;

    readonly causationId?:
    string;
}

function resolveRequestMetadata(
    input:
        IdentityRouteContextResolverInput,
): RequestMetadata {
    return {
        requestId:
            normalizeValue(
                input.request.id,
            )
            ?? "identity-http-request",

        correlationId:
            normalizeValue(
                firstHeaderValue(
                    input.request.headers[
                    "x-correlation-id"
                    ],
                ),
            ),

        causationId:
            normalizeValue(
                firstHeaderValue(
                    input.request.headers[
                    "x-causation-id"
                    ],
                ),
            ),
    };
}

// -----------------------------------------------------------------------------
// INTERNAL AUTHENTICATION CONTEXT
// -----------------------------------------------------------------------------

function createAuthenticationContext(
    input: {
        readonly engine:
        FolksdoEngine;

        readonly requestMetadata:
        RequestMetadata;
    },
): RuntimeContext {
    return input.engine.context.create({
        requestId:
            `${input.requestMetadata.requestId}:authenticate`,

        correlationId:
            input.requestMetadata.correlationId
            ?? input.requestMetadata.requestId,

        causationId:
            input.requestMetadata.causationId,

        actor: {
            actorId:
                AUTHENTICATION_ACTOR_ID,

            actorType:
                AUTHENTICATION_ACTOR_TYPE,
        },

        tenant: {
            tenantId:
                CONTROL_PLANE_TENANT_ID,

            tenantType:
                CONTROL_PLANE_TENANT_TYPE,
        },

        permissions:
            [],
    });
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function normalizeValue(
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

function firstHeaderValue(
    value:
        | string
        | string[]
        | undefined,
): string | undefined {
    return Array.isArray(
        value,
    )
        ? value[0]
        : value;
}