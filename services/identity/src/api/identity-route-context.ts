// services/identity/src/api/identity-route-context.ts
// -----------------------------------------------------------------------------
// IDENTITY ROUTE CONTEXT
// -----------------------------------------------------------------------------
// Host-created RuntimeContext resolvers consumed by Identity route adapters.
//
// A RuntimeContext alone is not proof of session ownership. Protected Identity
// routes receive the trusted authenticated session reference separately.
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

export interface IdentityRouteContextResolver {
    resolve(
        input:
            IdentityRouteContextResolverInput,
    ): Promise<RuntimeContext>;
}

export interface IdentityRouteContextResolverInput {
    readonly request:
    FastifyRequest;

    readonly reply:
    FastifyReply;
}

export interface IdentityAuthenticatedRouteContextResolver
    extends IdentityRouteContextResolver {
    resolveAuthenticatedSession(
        input:
            IdentityRouteContextResolverInput,
    ): Promise<IdentityAuthenticatedRouteContext>;
}

export interface IdentityAuthenticatedRouteContext {
    readonly context:
    RuntimeContext;

    /** Trusted session reference resolved from request authentication. */
    readonly sessionId:
    string;
}


export interface IdentityProviderReadSecurityResolver {
    resolvePlatform(input: IdentityRouteContextResolverInput): Promise<{
        readonly context: RuntimeContext;
        readonly security: {
            readonly scope: {
                readonly type: "platform";
                readonly tenantId: string;
                readonly membershipId: string;
            };
        };
    }>;
}
