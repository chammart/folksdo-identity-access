// services/membership/src/api/membership-route-context.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP ROUTE CONTEXT
// -----------------------------------------------------------------------------
// Fastify transport contract for resolving Folksdo Runtime Context.
//
// Purpose:
//   • derive the authenticated actor and request metadata
//   • provide Membership routes with a complete RuntimeContext
//   • isolate authentication and transport-specific context construction
//   • keep Membership routes independent from context implementation details
//
// Boundary:
//   • contains no Membership business logic
//   • performs no authorization decisions
//   • does not expose authentication-provider details to use cases
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

// -----------------------------------------------------------------------------
// RESOLUTION INPUT
// -----------------------------------------------------------------------------

export interface MembershipRouteContextResolverInput {
    readonly request: FastifyRequest;
    readonly reply: FastifyReply;
}

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface MembershipRouteContextResolver {
    resolve(
        input: MembershipRouteContextResolverInput,
    ): Promise<RuntimeContext>;
}

// -----------------------------------------------------------------------------
// PROVIDER READ SECURITY
// -----------------------------------------------------------------------------

export interface MembershipPlatformAuthorizationScope {
    readonly type: "platform";
    readonly tenantId: string;
    readonly membershipId: string;
}

export interface MembershipProviderReadSecurity {
    readonly scope: MembershipPlatformAuthorizationScope;
}

export interface MembershipProviderReadSecurityResolver {
    resolvePlatform(
        input: MembershipRouteContextResolverInput,
    ): Promise<{
        readonly context: RuntimeContext;
        readonly security: MembershipProviderReadSecurity;
    }>;
}

