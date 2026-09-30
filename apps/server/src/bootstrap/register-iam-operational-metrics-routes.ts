// apps/server/src/bootstrap/register-iam-operational-metrics-routes.ts
// -----------------------------------------------------------------------------
// IAM OPERATIONAL METRICS
// -----------------------------------------------------------------------------
// Safe administration metrics derived from canonical IAM state, replayable
// events and Processing failure records. Metrics are not authoritative state.
// Provider and Tenant visibility are separate, explicit and fail closed.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db, Filter } from "mongodb";
import {
    AccessHttpError,
    translateAccessHttpError,
    type AccessApi,
    type AccessApiRequestContext,
} from "@folksdo-identity-access/access";
import {
    translateIdentityHttpError,
    type IdentityProviderReadSecurityResolver,
} from "@folksdo-identity-access/identity";
import {
    translateMembershipHttpError,
    type MembershipApi,
    type MembershipRouteContextResolver,
} from "@folksdo-identity-access/membership";

interface TenantParams { readonly tenantId: string; }

export function registerIamOperationalMetricsRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
    readonly tenantContextResolver: MembershipRouteContextResolver;
}): void {
    input.app.get("/api/v1/admin/iam/metrics", async (request, reply) =>
        executeProvider(request, reply, async () => {
            await authorizeProvider(input, request, reply);
            return await buildMetrics(input.database);
        }));

    input.app.get<{ Params: TenantParams }>("/api/v1/tenants/:tenantId/iam/metrics", async (request, reply) =>
        executeTenant(request, reply, async () => {
            const tenantId = request.params.tenantId;
            await authorizeTenant(input, request, reply, tenantId);
            return await buildMetrics(input.database, tenantId);
        }));
}

async function buildMetrics(database: Db, tenantId?: string) {
    const membershipFilter = tenantId === undefined ? {} : { tenantId };
    const invitationFilter = tenantId === undefined ? {} : { targetTenantId: tenantId };
    const accessFilter = tenantId === undefined ? {} : { tenantId };
    const eventTenantFilter: Filter<Record<string, unknown>> = tenantId === undefined ? {} : {
        $or: [{ "metadata.tenantId": tenantId }, { "payload.tenantId": tenantId }],
    };

    const [
        identitiesTotal, identitiesActive, identitiesSuspended,
        sessionsActive, membershipsTotal, membershipsActive,
        invitationsPending, roleAssignmentsActive, directAssignmentsActive,
        authenticationEvents, authorizationEvents, accessDenials,
        processingFailures,
    ] = await Promise.all([
        tenantId === undefined
            ? database.collection("identity_users").countDocuments({})
            : countTenantIdentities(database, tenantId),
        tenantId === undefined
            ? database.collection("identity_users").countDocuments({ status: "active" })
            : countTenantIdentities(database, tenantId, "active"),
        tenantId === undefined
            ? database.collection("identity_users").countDocuments({ status: "suspended" })
            : countTenantIdentities(database, tenantId, "suspended"),
        tenantId === undefined
            ? database.collection("identity_sessions").countDocuments({ status: "active" })
            : countTenantSessions(database, tenantId),
        database.collection("membership_memberships").countDocuments(membershipFilter),
        database.collection("membership_memberships").countDocuments({ ...membershipFilter, status: "active" }),
        database.collection("membership_invitations").countDocuments({ ...invitationFilter, status: "pending" }),
        database.collection("access_role_assignments").countDocuments({ ...accessFilter, status: "active" }),
        database.collection("access_permission_assignments").countDocuments({ ...accessFilter, status: "active" }),
        database.collection("engine_events").countDocuments(and(eventTenantFilter, {
            eventType: { $in: [
                "identity.session.created", "identity.session_created",
                "identity.session_ended", "identity.password_reset_requested",
                "identity.user_email_verified",
            ] },
        })),
        database.collection("engine_events").countDocuments(and(eventTenantFilter, {
            eventType: { $regex: "^access\\." },
        })),
        countAccessDenials(database, tenantId),
        database.collection("engine_projection_failures").countDocuments(
            tenantId === undefined ? {} : { $or: [{ tenantId }, { "metadata.tenantId": tenantId }] },
        ),
    ]);

    return {
        scope: tenantId === undefined ? { type: "provider" } : { type: "tenant", tenantId },
        identities: { total: identitiesTotal, active: identitiesActive, suspended: identitiesSuspended },
        authentication: { lifecycleEvents: authenticationEvents },
        sessions: { active: sessionsActive },
        memberships: { total: membershipsTotal, active: membershipsActive },
        invitations: { pending: invitationsPending },
        authorization: {
            accessLifecycleEvents: authorizationEvents,
            activeRoleAssignments: roleAssignmentsActive,
            activeDirectAssignments: directAssignmentsActive,
            denials: accessDenials,
        },
        processing: { failures: processingFailures },
    };
}

async function countTenantIdentities(database: Db, tenantId: string, status?: string): Promise<number> {
    const identityIds = await tenantIdentityIds(database, tenantId);
    if (identityIds.length === 0) return 0;
    return await database.collection("identity_users").countDocuments({
        userId: { $in: identityIds },
        ...(status === undefined ? {} : { status }),
    });
}

async function countTenantSessions(database: Db, tenantId: string): Promise<number> {
    const identityIds = await tenantIdentityIds(database, tenantId);
    if (identityIds.length === 0) return 0;
    return await database.collection("identity_sessions").countDocuments({
        userId: { $in: identityIds },
        status: "active",
    });
}

async function tenantIdentityIds(database: Db, tenantId: string): Promise<string[]> {
    const rows = await database.collection<{ identityId: string }>("membership_memberships")
        .find({ tenantId }, { projection: { identityId: 1 } }).toArray();
    return [...new Set(rows.map(row => row.identityId).filter(Boolean))];
}

async function countAccessDenials(database: Db, tenantId?: string): Promise<number> {
    // Access currently owns low-cardinality authorization telemetry in-memory.
    // Until that telemetry is exposed by the Access runtime, the administration
    // projection may count only canonical denial facts if/when they exist.
    // Do not manufacture denial counts from unrelated lifecycle events.
    return await database.collection("engine_events").countDocuments(and(
        tenantId === undefined ? {} : {
            $or: [{ "metadata.tenantId": tenantId }, { "payload.tenantId": tenantId }],
        },
        { eventType: "access.authorization.denied" },
    ));
}

function and(left: Filter<Record<string, unknown>>, right: Filter<Record<string, unknown>>) {
    return Object.keys(left).length === 0 ? right : { $and: [left, right] };
}

async function authorizeProvider(
    input: Pick<Parameters<typeof registerIamOperationalMetricsRoutes>[0], "accessApi" | "providerSecurityResolver">,
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const resolved = await input.providerSecurityResolver.resolvePlatform({ request, reply });
    const context: AccessApiRequestContext = {
        requestId: resolved.context.requestId,
        correlationId: resolved.context.correlationId ?? resolved.context.requestId,
        causationId: resolved.context.causationId,
        actor: { actorId: resolved.context.actor.actorId, actorType: "identity" },
        tenant: { tenantId: resolved.security.scope.tenantId, tenantType: "platform" },
        membershipId: resolved.security.scope.membershipId,
        permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: "iam.view",
        resource: { type: "metrics", id: "provider" },
        membershipId: resolved.security.scope.membershipId,
        tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Provider IAM metrics access is denied.");
}

async function authorizeTenant(
    input: Pick<Parameters<typeof registerIamOperationalMetricsRoutes>[0], "membershipApi" | "accessApi" | "tenantContextResolver">,
    request: FastifyRequest,
    reply: FastifyReply,
    tenantId: string,
) {
    const context = await input.tenantContextResolver.resolve({ request, reply });
    const memberships = await input.membershipApi.listTenantMemberships(tenantId, context);
    const actorMembership = memberships.find(m => m.identityId === context.actor.actorId && m.status === "active");
    if (actorMembership === undefined) throw new AccessHttpError(403, "access_denied", "Active tenant Membership is required.");
    const accessContext: AccessApiRequestContext = {
        requestId: context.requestId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        actor: { actorId: context.actor.actorId, actorType: "identity" },
        tenant: { tenantId, tenantType: "tenant" },
        membershipId: actorMembership.membershipId,
        permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: "iam.view",
        resource: { type: "metrics", id: tenantId },
        membershipId: actorMembership.membershipId,
        tenantId,
    }, accessContext);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Tenant IAM metrics access is denied.");
}

async function executeProvider(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
    try { return reply.status(200).send(await operation()); }
    catch (error) {
        const identity = translateIdentityHttpError(error);
        const accessError = translateAccessHttpError(error);
        const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() };
        const translated = [identity, access].find(candidate => candidate.statusCode < 500) ?? identity;
        request.log.error({ requestId: request.id, route: "provider-iam-metrics", error }, "Provider IAM metrics lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}

async function executeTenant(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
    try { return reply.status(200).send(await operation()); }
    catch (error) {
        const membership = translateMembershipHttpError(error);
        const accessError = translateAccessHttpError(error);
        const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() };
        const translated = [membership, access].find(candidate => candidate.statusCode < 500) ?? membership;
        request.log.error({ requestId: request.id, route: "tenant-iam-metrics", error }, "Tenant IAM metrics lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
