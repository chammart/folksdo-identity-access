// apps/server/src/bootstrap/register-iam-person-detail-routes.ts
// -----------------------------------------------------------------------------
// IAM PERSON DETAIL / IAM 360 ADMINISTRATION PROJECTION
// -----------------------------------------------------------------------------
// Host-owned composition only. Identity, Membership and Access remain the
// authoritative owners of every fact returned by this projection.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { translateAccessHttpError, type AccessApi, type AccessApiRequestContext } from "@folksdo-identity-access/access";
import { translateIdentityHttpError, type IdentityApi, type IdentityProviderReadSecurityResolver } from "@folksdo-identity-access/identity";
import { translateMembershipHttpError, type MembershipApi, type MembershipResult, type MembershipRouteContextResolver } from "@folksdo-identity-access/membership";

interface IdentityParams { readonly userId: string; }
interface TenantIdentityParams extends IdentityParams { readonly tenantId: string; }

export function registerIamPersonDetailRoutes(input: {
    readonly app: FastifyInstance;
    readonly identityApi: IdentityApi;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly tenantContextResolver: MembershipRouteContextResolver;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get<{ Params: IdentityParams }>("/api/v1/admin/identities/:userId/iam-360", async (request, reply) =>
        execute(request, reply, async () => {
            const resolved = await input.providerSecurityResolver.resolvePlatform({ request, reply });
            const identity = await input.identityApi.getIdentityForProvider(request.params.userId, resolved.context, resolved.security);
            const security = await input.identityApi.getIdentitySecuritySummary(request.params.userId, resolved.context, resolved.security);
            const memberships = await listAllProviderMemberships(input.membershipApi, request.params.userId, resolved.context, resolved.security);
            const accessContext = toAccessContext(resolved.context, resolved.security.scope.membershipId, resolved.security.scope.tenantId, "platform");
            const relationships = await Promise.all(memberships.map(membership => composeRelationship(input.accessApi, membership, accessContext)));
            return { identity, memberships: relationships, security };
        }));

    input.app.get<{ Params: TenantIdentityParams }>("/api/v1/tenants/:tenantId/people/:userId", async (request, reply) =>
        execute(request, reply, async () => {
            const context = await input.tenantContextResolver.resolve({ request, reply });
            const tenantMemberships = await input.membershipApi.listTenantMemberships(request.params.tenantId, context);
            const actorMembership = tenantMemberships.find(m => m.identityId === context.actor.actorId && m.status === "active");
            if (!actorMembership) throw new Error("Active administrative Membership context is unavailable.");
            const membership = tenantMemberships.find(m => m.identityId === request.params.userId);
            if (!membership) return reply.status(404).send({ error: { code: "membership_not_found", message: "Person is not a member of this tenant." } });
            const securityScope = { scope: { type: "tenant" as const, tenantId: request.params.tenantId, membershipId: actorMembership.membershipId } };
            const identity = await input.identityApi.getIdentityForTenantAdministration(request.params.userId, context, securityScope);
            const security = await input.identityApi.getIdentitySecuritySummary(request.params.userId, context, securityScope);
            const relationship = await composeRelationship(input.accessApi, membership, toAccessContext(context, actorMembership.membershipId, request.params.tenantId, "tenant"));
            return { identity, membership: relationship, security };
        }));
}

async function listAllProviderMemberships(api: MembershipApi, identityId: string, context: Parameters<MembershipApi["listMembershipsForProvider"]>[1], security: Parameters<MembershipApi["listMembershipsForProvider"]>[2]) {
    const items = [] as Awaited<ReturnType<MembershipApi["listMembershipsForProvider"]>>["items"][number][];
    let offset = 0;
    const limit = 100;
    while (true) {
        const page = await api.listMembershipsForProvider({ identityId, offset, limit }, context, security);
        items.push(...page.items);
        offset += page.items.length;
        if (offset >= page.total || page.items.length === 0) return items;
    }
}

async function composeRelationship(accessApi: AccessApi, membership: MembershipResult, context: AccessApiRequestContext) {
    const [roles, direct] = await Promise.all([
        accessApi.listRoleAssignments({ membershipId: membership.membershipId, tenantId: membership.tenantId, limit: 1000, offset: 0 }, context),
        accessApi.listPermissionAssignments({ membershipId: membership.membershipId, tenantId: membership.tenantId, limit: 1000, offset: 0 }, context),
    ]);
    const activeRoles = roles.items.filter(item => item.status === "active");
    const activeDirect = direct.items.filter(item => item.status === "active");
    return {
        membership,
        roles: roles.items,
        directAccess: activeDirect,
        effectiveAccessSummary: {
            activeRoleCount: activeRoles.length,
            activeDirectGrantCount: activeDirect.filter(item => item.effect === "grant").length,
            activeDirectDenyCount: activeDirect.filter(item => item.effect === "deny").length,
        },
    };
}

function toAccessContext(context: { requestId: string; correlationId?: string; causationId?: string; actor: { actorId: string } }, membershipId: string, tenantId: string, tenantType: "tenant" | "platform"): AccessApiRequestContext {
    return {
        requestId: context.requestId,
        correlationId: context.correlationId ?? context.requestId,
        causationId: context.causationId,
        actor: { actorId: context.actor.actorId, actorType: "identity" },
        tenant: { tenantId, tenantType },
        membershipId,
        permissions: [],
    };
}

async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>): Promise<unknown> {
    try {
        const result = await operation();
        if (reply.sent) return result;
        return reply.status(200).send(result);
    } catch (error) {
        const candidates = [translateMembershipHttpError(error), translateIdentityHttpError(error), (() => { const e = translateAccessHttpError(error); return { statusCode: e.statusCode, body: e.toResponseBody() }; })()];
        const translated = candidates.find(candidate => candidate.statusCode < 500) ?? candidates[0];
        request.log.error({ requestId: request.id, route: "iam-person-detail", error }, "IAM Person Detail lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
