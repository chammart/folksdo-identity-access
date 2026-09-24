// apps/server/src/authorization/create-identity-access-authorizer.ts
import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { AccessApi, AccessApiRequestContext } from "@folksdo-identity-access/access";
import type { IdentityAccessAuthorizer, IdentityAccessAuthorizationDecision, IdentityAccessAuthorizationRequest, IdentityPermission } from "@folksdo-identity-access/identity";

export interface IdentityAccessAuthorizerBinding extends IdentityAccessAuthorizer {
    bind(accessApi: Pick<AccessApi, "authorize">): void;
}

export function createIdentityAccessAuthorizer(): IdentityAccessAuthorizerBinding {
    let accessApi: Pick<AccessApi, "authorize"> | undefined;
    return {
        bind(candidate) {
            if (accessApi !== undefined) throw new Error("Identity Access authorizer is already bound.");
            accessApi = candidate;
        },
        async authorize(request, context): Promise<IdentityAccessAuthorizationDecision> {
            if (accessApi === undefined) throw new Error("Identity Access authorization is unavailable.");
            const permission = parseIdentityPermission(request.permission);
            if (permission.resource !== request.resource.type) throw new Error("Identity authorization Permission and resource type do not match.");
            const decision = await accessApi.authorize({
                action: `${permission.service}.${permission.action}`,
                resource: { type: request.resource.type, id: request.resource.id },
                membershipId: request.scope.membershipId,
                tenantId: request.scope.tenantId,
            }, createAccessContext(request, context));
            return { allowed: decision.allowed, decisionId: decision.decisionId, reasonCode: decision.reasonCode };
        },
    };
}

function parseIdentityPermission(permission: IdentityPermission) {
    const parts = permission.split(".");
    if (parts.length !== 3) throw new Error(`Invalid canonical Identity Permission: ${permission}.`);
    const [service, resource, action] = parts;
    if (!service || !resource || !action) throw new Error(`Invalid canonical Identity Permission: ${permission}.`);
    return { service, resource, action };
}

function createAccessContext(request: IdentityAccessAuthorizationRequest, context: RuntimeContext): AccessApiRequestContext {
    return {
        requestId: context.requestId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        actor: { actorId: context.actor.actorId, actorType: context.actor.actorType === "user" ? "identity" : "system" },
        tenant: { tenantId: request.scope.tenantId, tenantType: "tenant" },
        membershipId: request.scope.membershipId,
        permissions: [],
    };
}
