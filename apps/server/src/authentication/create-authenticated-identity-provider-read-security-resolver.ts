// apps/server/src/authentication/create-authenticated-identity-provider-read-security-resolver.ts
import type { FolksdoEngine } from "@folksdo-engine/runtime";
import type { IdentityAuthenticatedRouteContextResolver, IdentityProviderReadSecurityResolver } from "@folksdo-identity-access/identity";
import type { MembershipApi } from "@folksdo-identity-access/membership";

export interface CreateAuthenticatedIdentityProviderReadSecurityResolverInput {
    readonly engine: FolksdoEngine;
    readonly authenticatedContextResolver: IdentityAuthenticatedRouteContextResolver;
    readonly getMembershipApi: () => Pick<MembershipApi, "getCurrentContext">;
}

export function createAuthenticatedIdentityProviderReadSecurityResolver(input: CreateAuthenticatedIdentityProviderReadSecurityResolverInput): IdentityProviderReadSecurityResolver {
    return {
        async resolvePlatform(resolverInput) {
            const authenticated = await input.authenticatedContextResolver.resolveAuthenticatedSession(resolverInput);
            const membershipContext = await input.getMembershipApi().getCurrentContext(
                authenticated.context.actor.actorId,
                input.engine.context.create({
                    requestId: `${authenticated.context.requestId}:membership-context`,
                    correlationId: authenticated.context.correlationId ?? authenticated.context.requestId,
                    causationId: authenticated.context.causationId,
                    actor: { actorId: authenticated.context.actor.actorId, actorType: "user" },
                    tenant: { tenantId: authenticated.context.tenant.tenantId, tenantType: authenticated.context.tenant.tenantType },
                    permissions: [],
                }),
            );
            const context = input.engine.context.create({
                requestId: authenticated.context.requestId,
                correlationId: authenticated.context.correlationId ?? authenticated.context.requestId,
                causationId: authenticated.context.causationId,
                actor: { actorId: authenticated.context.actor.actorId, actorType: "user" },
                tenant: { tenantId: membershipContext.activeTenantId, tenantType: "customer" },
                permissions: [],
            });
            return {
                context,
                security: {
                    scope: { type: "platform", tenantId: membershipContext.activeTenantId, membershipId: membershipContext.activeMembershipId },
                },
            };
        },
    };
}
