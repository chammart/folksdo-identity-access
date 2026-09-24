// apps/server/src/authentication/create-authenticated-membership-context-resolver.ts
// -----------------------------------------------------------------------------
// CREATE AUTHENTICATED MEMBERSHIP CONTEXT RESOLVER
// -----------------------------------------------------------------------------
// Host-owned authentication adapter for Membership Operations™.
//
// Purpose:
//   • resolve the Identity session reference from the HTTP request
//   • validate the session through the public Identity API
//   • construct the canonical Folksdo Engine RuntimeContext
//   • keep Identity provider and persistence details outside Membership
//
// Architectural rules:
//   • the host coordinates service boundaries
//   • Membership never reads Identity collections directly
//   • Membership never imports BetterAuth or provider session types
//   • Folksdo Engine remains the owner of RuntimeContext construction
//   • session references are never copied into logs, errors, or metadata
//   • authentication establishes Identity, not Membership authorization
//   • RuntimeContext.permissions is not Membership authorization authority
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    IdentityApi,
} from "@folksdo-identity-access/identity";

import type {
    MembershipRouteContextResolver,
    MembershipRouteContextResolverInput,
} from "@folksdo-identity-access/membership";

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

export interface CreateAuthenticatedMembershipContextResolverInput {
    readonly engine:
    FolksdoEngine;

    readonly identityApi:
    IdentityApi;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAuthenticatedMembershipContextResolver(
    input:
        CreateAuthenticatedMembershipContextResolverInput,
): MembershipRouteContextResolver {
    return {
        async resolve(
            resolverInput:
                MembershipRouteContextResolverInput,
        ): Promise<RuntimeContext> {
            const sessionId =
                resolveIdentitySessionReference(
                    resolverInput,
                );

            if (
                !sessionId
            ) {
                throw createAuthenticationError(
                    "missing_session",
                );
            }

            const requestMetadata =
                resolveRequestMetadata(
                    resolverInput,
                );

            try {
                const session =
                    await input.identityApi.getCurrentSession(
                        {
                            sessionId,
                        },

                        createAuthenticationContext({
                            engine:
                                input.engine,

                            requestMetadata,
                        }),
                    );

                return input.engine.context.create({
                    requestId:
                        requestMetadata.requestId,

                    correlationId:
                        requestMetadata.correlationId,

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

                    permissions: [],
                });
            } catch (
            error
            ) {
                if (
                    error instanceof SecurityError
                ) {
                    throw error;
                }

                throw createAuthenticationError(
                    "invalid_session",
                );
            }
        },
    };
}

// -----------------------------------------------------------------------------
// SESSION REFERENCE RESOLUTION
// -----------------------------------------------------------------------------
// Membership accepts the same explicit session transports already exposed by
// Identity Operations™. Query-string session references are intentionally not
// accepted for protected Membership endpoints because URLs are commonly logged.
// -----------------------------------------------------------------------------

function resolveIdentitySessionReference(
    input:
        MembershipRouteContextResolverInput,
): string | undefined {
    const explicitHeader =
        firstHeaderValue(
            input.request.headers[
            "x-identity-session-id"
            ],
        )
        ?? firstHeaderValue(
            input.request.headers[
            "x-session-id"
            ],
        );

    if (
        explicitHeader?.trim()
    ) {
        return explicitHeader.trim();
    }

    const authorization =
        firstHeaderValue(
            input.request.headers.authorization,
        );

    if (
        !authorization
    ) {
        return undefined;
    }

    const match =
        /^Bearer\s+(.+)$/i.exec(
            authorization,
        );

    const bearerToken =
        match?.[1]?.trim();

    return bearerToken
        || undefined;
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
        MembershipRouteContextResolverInput,
): RequestMetadata {
    return {
        requestId:
            normalizeMetadataValue(
                input.request.id,
            )
            ?? "membership-http-request",

        correlationId:
            normalizeMetadataValue(
                firstHeaderValue(
                    input.request.headers[
                    "x-correlation-id"
                    ],
                ),
            ),

        causationId:
            normalizeMetadataValue(
                firstHeaderValue(
                    input.request.headers[
                    "x-causation-id"
                    ],
                ),
            ),
    };
}

function normalizeMetadataValue(
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

    return normalized
        || undefined;
}

function firstHeaderValue(
    value:
        string
        | string[]
        | undefined,
): string | undefined {
    if (
        Array.isArray(
            value,
        )
    ) {
        return value[0];
    }

    return value;
}

// -----------------------------------------------------------------------------
// AUTHENTICATION CONTEXT
// -----------------------------------------------------------------------------
// Identity session validation itself requires a RuntimeContext. The host uses a
// system actor for that internal synchronous service call, then replaces it with
// the authenticated Identity actor for the Membership operation.
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

        permissions: [],
    });
}

// -----------------------------------------------------------------------------
// SAFE AUTHENTICATION ERROR
// -----------------------------------------------------------------------------

function createAuthenticationError(
    reason:
        "missing_session"
        | "invalid_session",
): SecurityError {
    return new SecurityError(
        "Authentication is required for Membership Operations.",
        {
            securityType:
                "authentication",

            reason,
        },
    );
}
