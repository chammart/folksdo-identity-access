// apps/server/src/bootstrap/register-iam-audit-export-routes.ts
// -----------------------------------------------------------------------------
// IAM ADMINISTRATIVE AUDIT EXPORT
// -----------------------------------------------------------------------------
// Bounded export over the existing Engine IAM event authority. This creates no
// duplicate audit store and never returns raw event payload or raw metadata.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db, Filter } from "mongodb";
import {
    AccessHttpError, translateAccessHttpError,
    type AccessApi, type AccessApiRequestContext,
} from "@folksdo-identity-access/access";
import {
    translateIdentityHttpError, type IdentityProviderReadSecurityResolver,
} from "@folksdo-identity-access/identity";
import {
    translateMembershipHttpError, type MembershipApi, type MembershipRouteContextResolver,
} from "@folksdo-identity-access/membership";

interface ExportQuery {
    readonly capability?: string;
    readonly eventType?: string;
    readonly actorId?: string;
    readonly from?: string;
    readonly to?: string;
    readonly limit?: string;
}
interface TenantParams { readonly tenantId: string; }
interface StoredEvent {
    readonly eventId?: string; readonly eventType?: string;
    readonly aggregateType?: string; readonly aggregateId?: string;
    readonly occurredAt?: string; readonly payload?: Record<string, unknown>;
    readonly metadata?: Record<string, unknown>;
}

export function registerIamAuditExportRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
    readonly tenantContextResolver: MembershipRouteContextResolver;
}): void {
    input.app.get<{ Querystring: ExportQuery }>("/api/v1/admin/iam/audit-export", async (request, reply) =>
        executeProvider(request, reply, async () => {
            await authorizeProvider(input, request, reply);
            return await exportEvents(input.database, request.query);
        }));
    input.app.get<{ Params: TenantParams; Querystring: ExportQuery }>("/api/v1/tenants/:tenantId/iam/audit-export", async (request, reply) =>
        executeTenant(request, reply, async () => {
            await authorizeTenant(input, request, reply, request.params.tenantId);
            return await exportEvents(input.database, request.query, request.params.tenantId);
        }));
}

async function exportEvents(database: Db, query: ExportQuery, tenantId?: string) {
    const limit = boundedInteger(query.limit, 100, 1, 1000);
    const filter = buildFilter(query, tenantId);
    const events = await database.collection<StoredEvent>("engine_events")
        .find(filter).sort({ occurredAt: -1, eventId: -1 }).limit(limit).toArray();
    return {
        format: "iam-administration-activity-v1",
        scope: tenantId === undefined ? { type: "provider" } : { type: "tenant", tenantId },
        count: events.length,
        limit,
        items: events.map(toExportItem),
    };
}
function buildFilter(query: ExportQuery, tenantId?: string): Filter<StoredEvent> {
    const filters: Filter<StoredEvent>[] = [];
    if (tenantId !== undefined) filters.push({ $or: [{ "metadata.tenantId": tenantId }, { "payload.tenantId": tenantId }] });
    if (query.capability) filters.push({ eventType: { $regex: `^${escapeRegex(query.capability)}\\.` } });
    if (query.eventType) filters.push({ eventType: query.eventType });
    if (query.actorId) filters.push({ "metadata.actorId": query.actorId });
    const occurredAt: Record<string, string> = {};
    if (query.from) occurredAt.$gte = timestamp(query.from, "from");
    if (query.to) occurredAt.$lte = timestamp(query.to, "to");
    if (Object.keys(occurredAt).length) filters.push({ occurredAt });
    return filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { $and: filters };
}
function toExportItem(event: StoredEvent) {
    const metadata = event.metadata ?? {};
    const eventType = required(event.eventType, "eventType");
    return {
        activityId: event.eventId ?? `${required(event.aggregateType, "aggregateType")}:${required(event.aggregateId, "aggregateId")}:${required(event.occurredAt, "occurredAt")}`,
        eventType,
        capability: eventType.split(".")[0] ?? "iam",
        occurredAt: required(event.occurredAt, "occurredAt"),
        resource: { type: required(event.aggregateType, "aggregateType"), id: required(event.aggregateId, "aggregateId") },
        actorId: optional(metadata.actorId),
        tenantId: optional(metadata.tenantId) ?? optional(event.payload?.tenantId),
        requestId: optional(metadata.requestId),
        correlationId: optional(metadata.correlationId),
    };
}
function required(value: unknown, name: string) { if (typeof value !== "string" || !value) throw new Error(`IAM event ${name} is invalid.`); return value; }
function optional(value: unknown) { return typeof value === "string" && value.length ? value : null; }
function timestamp(value: string, name: string) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new AccessHttpError(400, "validation_error", `IAM audit export ${name} timestamp is invalid.`);
    return new Date(parsed).toISOString();
}
function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AccessHttpError(400, "validation_error", "IAM audit export limit is invalid.");
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AccessHttpError(400, "validation_error", "IAM audit export limit is invalid.");
    return parsed;
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

async function authorizeProvider(input: Pick<Parameters<typeof registerIamAuditExportRoutes>[0], "accessApi" | "providerSecurityResolver">, request: FastifyRequest, reply: FastifyReply) {
    const resolved = await input.providerSecurityResolver.resolvePlatform({ request, reply });
    const context: AccessApiRequestContext = {
        requestId: resolved.context.requestId, correlationId: resolved.context.correlationId ?? resolved.context.requestId,
        causationId: resolved.context.causationId, actor: { actorId: resolved.context.actor.actorId, actorType: "identity" },
        tenant: { tenantId: resolved.security.scope.tenantId, tenantType: "platform" },
        membershipId: resolved.security.scope.membershipId, permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: "iam.export", resource: { type: "audit", id: "provider" },
        membershipId: resolved.security.scope.membershipId, tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Provider IAM audit export access is denied.");
}
async function authorizeTenant(input: Pick<Parameters<typeof registerIamAuditExportRoutes>[0], "membershipApi" | "accessApi" | "tenantContextResolver">, request: FastifyRequest, reply: FastifyReply, tenantId: string) {
    const context = await input.tenantContextResolver.resolve({ request, reply });
    const memberships = await input.membershipApi.listTenantMemberships(tenantId, context);
    const actorMembership = memberships.find(m => m.identityId === context.actor.actorId && m.status === "active");
    if (!actorMembership) throw new AccessHttpError(403, "access_denied", "Active tenant Membership is required.");
    const accessContext: AccessApiRequestContext = {
        requestId: context.requestId, correlationId: context.correlationId, causationId: context.causationId,
        actor: { actorId: context.actor.actorId, actorType: "identity" },
        tenant: { tenantId, tenantType: "tenant" }, membershipId: actorMembership.membershipId, permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: "iam.export", resource: { type: "audit", id: tenantId },
        membershipId: actorMembership.membershipId, tenantId,
    }, accessContext);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Tenant IAM audit export access is denied.");
}
async function executeProvider(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
    try { return reply.status(200).send(await operation()); } catch (error) {
        const identity = translateIdentityHttpError(error); const ae = translateAccessHttpError(error);
        const access = { statusCode: ae.statusCode, body: ae.toResponseBody() };
        const translated = [identity, access].find(x => x.statusCode < 500) ?? identity;
        return reply.status(translated.statusCode).send(translated.body);
    }
}
async function executeTenant(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
    try { return reply.status(200).send(await operation()); } catch (error) {
        const membership = translateMembershipHttpError(error); const ae = translateAccessHttpError(error);
        const access = { statusCode: ae.statusCode, body: ae.toResponseBody() };
        const translated = [membership, access].find(x => x.statusCode < 500) ?? membership;
        return reply.status(translated.statusCode).send(translated.body);
    }
}
