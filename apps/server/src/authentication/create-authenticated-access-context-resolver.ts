// apps/server/src/authentication/create-authenticated-access-context-resolver.ts
// -----------------------------------------------------------------------------
// CREATE AUTHENTICATED ACCESS CONTEXT RESOLVER
// -----------------------------------------------------------------------------
// Host-owned security composition adapter for Access Operations™.
//
// Purpose:
//   • validate the Identity session through the public Identity API
//   • resolve the actor's active tenant execution context through Membership
//   • construct the canonical Access API request context
//
// Security rules:
//   • request headers never grant Access permissions
//   • request headers never select the active tenant context
//   • provider context is never granted as an unauthenticated default
//   • BetterAuth internals never cross the Identity service boundary
//   • Membership remains the authority for active tenant execution context
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    AccessApiRequestContextResolver,
} from "@folksdo-identity-access/access";

import type {
    IdentityApi,
} from "@folksdo-identity-access/identity";

import type {
    MembershipApi,
} from "@folksdo-identity-access/membership";

import type {
    FastifyRequest,
} from "fastify";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const CONTROL_PLANE_TENANT_ID =
    "folksdo-control-plane";

const AUTHENTICATION_ACTOR_ID =
    "iam-http-authenticator";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface CreateAuthenticatedAccessContextResolverInput {
    readonly engine:
    FolksdoEngine;

    readonly identityApi:
    Pick<IdentityApi, "getCurrentSession">;

    readonly membershipApi:
    Pick<MembershipApi, "getCurrentContext">;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAuthenticatedAccessContextResolver(
    input: CreateAuthenticatedAccessContextResolverInput,
): AccessApiRequestContextResolver {
    return {
        async resolve(
            request,
        ) {
            const sessionId =
                resolveIdentitySessionReference(
                    request,
                );

            if (!sessionId) {
                throw createAuthenticationError(
                    "missing_session",
                );
            }

            const metadata =
                resolveRequestMetadata(
                    request,
                );

            const session =
                await resolveAuthenticatedSession({
                    input,
                    sessionId,
                    metadata,
                });

            const identityContext =
                createIdentityContext({
                    engine:
                        input.engine,

                    identityId:
                        session.userId,

                    metadata,
                });

            const membershipContext =
                await resolveActiveMembershipContext({
                    membershipApi:
                        input.membershipApi,

                    identityId:
                        session.userId,

                    context:
                        identityContext,
                });

            return {
                requestId:
                    metadata.requestId,

                correlationId:
                    metadata.correlationId
                    ?? metadata.requestId,

                causationId:
                    metadata.causationId,

                actor: {
                    actorId:
                        session.userId,

                    actorType:
                        "identity",
                },

                membershipId:
                    membershipContext.activeMembershipId,

                tenant: {
                    tenantId:
                        membershipContext.activeTenantId,

                    tenantType:
                        membershipContext.activeTenantId
                        === CONTROL_PLANE_TENANT_ID
                            ? "platform"
                            : "tenant",
                },
            };
        },
    };
}

// -----------------------------------------------------------------------------
// AUTHENTICATION
// -----------------------------------------------------------------------------

async function resolveAuthenticatedSession(
    input: {
        readonly input:
        CreateAuthenticatedAccessContextResolverInput;

        readonly sessionId:
        string;

        readonly metadata:
        RequestMetadata;
    },
): Promise<Awaited<ReturnType<IdentityApi["getCurrentSession"]>>> {
    try {
        return await input.input.identityApi.getCurrentSession(
            {
                sessionId:
                    input.sessionId,
            },
            createAuthenticationContext({
                engine:
                    input.input.engine,

                metadata:
                    input.metadata,
            }),
        );
    } catch (error) {
        if (error instanceof SecurityError) {
            throw error;
        }

        throw createAuthenticationError(
            "invalid_session",
        );
    }
}

function createAuthenticationContext(
    input: {
        readonly engine:
        FolksdoEngine;

        readonly metadata:
        RequestMetadata;
    },
): RuntimeContext {
    return input.engine.context.create({
        requestId:
            `${input.metadata.requestId}:authenticate`,

        correlationId:
            input.metadata.correlationId ??
            input.metadata.requestId,

        causationId:
            input.metadata.causationId,

        actor: {
            actorId:
                AUTHENTICATION_ACTOR_ID,

            actorType:
                "system",
        },

        tenant: {
            tenantId:
                CONTROL_PLANE_TENANT_ID,

            tenantType:
                "provider",
        },

        permissions:
            [],
    });
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT
// -----------------------------------------------------------------------------

async function resolveActiveMembershipContext(
    input: {
        readonly membershipApi:
        Pick<MembershipApi, "getCurrentContext">;

        readonly identityId:
        string;

        readonly context:
        RuntimeContext;
    },
): Promise<Awaited<ReturnType<MembershipApi["getCurrentContext"]>>> {
    try {
        return await input.membershipApi.getCurrentContext(
            input.identityId,
            input.context,
        );
    } catch {
        throw new SecurityError(
            "An active Membership context is required for Access Operations.",
            {
                securityType:
                    "authorization",

                reason:
                    "active_membership_context_required",
            },
        );
    }
}

function createIdentityContext(
    input: {
        readonly engine:
        FolksdoEngine;

        readonly identityId:
        string;

        readonly metadata:
        RequestMetadata;
    },
): RuntimeContext {
    return input.engine.context.create({
        requestId:
            `${input.metadata.requestId}:membership-context`,

        correlationId:
            input.metadata.correlationId ??
            input.metadata.requestId,

        causationId:
            input.metadata.causationId,

        actor: {
            actorId:
                input.identityId,

            actorType:
                "user",
        },

        tenant: {
            tenantId:
                CONTROL_PLANE_TENANT_ID,

            tenantType:
                "provider",
        },

        permissions:
            [],
    });
}

function resolveTrustedTenantType(
    tenantId: string,
): RuntimeContext["tenant"]["tenantType"] {
    return tenantId === CONTROL_PLANE_TENANT_ID
        ? "provider"
        : "customer";
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
    request: FastifyRequest,
): RequestMetadata {
    return {
        requestId:
            String(
                request.id,
            ),

        correlationId:
            normalizeHeader(
                firstHeaderValue(
                    request.headers[
                    "x-correlation-id"
                    ],
                ),
            ),

        causationId:
            normalizeHeader(
                firstHeaderValue(
                    request.headers[
                    "x-causation-id"
                    ],
                ),
            ),
    };
}

// -----------------------------------------------------------------------------
// SESSION REFERENCE
// -----------------------------------------------------------------------------

function resolveIdentitySessionReference(
    request: FastifyRequest,
): string | undefined {
    const explicitSessionId =
        normalizeHeader(
            firstHeaderValue(
                request.headers[
                "x-identity-session-id"
                ],
            ) ??
            firstHeaderValue(
                request.headers[
                "x-session-id"
                ],
            ),
        );

    if (explicitSessionId) {
        return explicitSessionId;
    }

    const authorization =
        firstHeaderValue(
            request.headers.authorization,
        );

    return authorization
        ?.match(
            /^Bearer\s+(.+)$/i,
        )
        ?.[1]
        ?.trim();
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

function createAuthenticationError(
    reason:
        "missing_session" | "invalid_session",
): SecurityError {
    return new SecurityError(
        "Authentication is required for Access Operations.",
        {
            securityType:
                "authentication",

            reason,
        },
    );
}

// -----------------------------------------------------------------------------
// HEADER HELPERS
// -----------------------------------------------------------------------------

function normalizeHeader(
    value: string | undefined,
): string | undefined {
    const normalized =
        value?.trim();

    return normalized || undefined;
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
