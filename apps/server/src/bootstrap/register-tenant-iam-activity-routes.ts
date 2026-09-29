// apps/server/src/bootstrap/register-tenant-iam-activity-routes.ts
// -----------------------------------------------------------------------------
// TENANT IAM ACTIVITY ADMINISTRATION PROJECTION
// -----------------------------------------------------------------------------
// Human-oriented, tenant-scoped administration reads over existing IAM events.
//
// Architectural rules:
//   • engine_events remains the authoritative event store
//   • no canonical state or duplicate event store is created here
//   • tenant authority is established before event access
//   • raw event payload and metadata are never returned
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db, Document, Filter } from "mongodb";
import {
    AccessHttpError,
    translateAccessHttpError,
    type AccessApi,
    type AccessApiRequestContext,
} from "@folksdo-identity-access/access";
import {
    translateMembershipHttpError,
    type MembershipApi,
    type MembershipRouteContextResolver,
} from "@folksdo-identity-access/membership";

const TENANT_ACTIVITY_PERMISSION = {
    permissionId: "iam.activity.list",
    service: "iam",
    resource: "activity",
    action: "list",
} as const;

interface TenantActivityParams { readonly tenantId: string; }
interface TenantActivityQuery {
    readonly capability?: string;
    readonly eventType?: string;
    readonly actorId?: string;
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly from?: string;
    readonly to?: string;
    readonly offset?: string;
    readonly limit?: string;
}

interface StoredIamEvent extends Document {
    readonly eventId?: string;
    readonly eventType?: string;
    readonly aggregateType?: string;
    readonly aggregateId?: string;
    readonly occurredAt?: string;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export function registerTenantIamActivityRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly contextResolver: MembershipRouteContextResolver;
}): void {
    input.app.get<{ Params: TenantActivityParams; Querystring: TenantActivityQuery }>(
        "/api/v1/tenants/:tenantId/iam/activity",
        async (request, reply) => execute(request, reply, async () => {
            const context = await input.contextResolver.resolve({ request, reply });
            const tenantId = request.params.tenantId;

            // Membership owns WHERE. Resolve the actor's active tenant Membership
            // before any event-store query is allowed.
            const memberships = await input.membershipApi.listTenantMemberships(tenantId, context);
            const actorMembership = memberships.find(
                membership => membership.identityId === context.actor.actorId
                    && membership.status === "active",
            );
            if (actorMembership === undefined) {
                throw new AccessHttpError(403, "access_denied", "Active tenant Membership is required.");
            }

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
                action: `${TENANT_ACTIVITY_PERMISSION.service}.${TENANT_ACTIVITY_PERMISSION.action}`,
                resource: { type: TENANT_ACTIVITY_PERMISSION.resource, id: tenantId },
                membershipId: actorMembership.membershipId,
                tenantId,
            }, accessContext);
            if (!decision.allowed) {
                throw new AccessHttpError(403, "access_denied", "Tenant IAM activity access is denied.");
            }

            const offset = parseBoundedInteger(request.query.offset, 0, 0, 100000);
            const limit = parseBoundedInteger(request.query.limit, 50, 1, 100);
            const filter = buildFilter(tenantId, request.query);
            const collection = input.database.collection<StoredIamEvent>("engine_events");
            const [events, total] = await Promise.all([
                collection.find(filter).sort({ occurredAt: -1, eventId: -1 }).skip(offset).limit(limit).toArray(),
                collection.countDocuments(filter),
            ]);

            return {
                items: events.map(toActivity),
                total,
                offset,
                limit,
            };
        }),
    );
}

function buildFilter(tenantId: string, query: TenantActivityQuery): Filter<StoredIamEvent> {
    const conditions: Filter<StoredIamEvent>[] = [
        {
            $or: [
                { "metadata.tenantId": tenantId },
                { "payload.tenantId": tenantId },
            ],
        },
    ];

    if (query.eventType) conditions.push({ eventType: query.eventType });
    if (query.actorId) conditions.push({ "metadata.actorId": query.actorId });
    if (query.requestId) conditions.push({ "metadata.requestId": query.requestId });
    if (query.correlationId) conditions.push({ "metadata.correlationId": query.correlationId });
    if (query.capability) conditions.push({ eventType: { $regex: `^${escapeRegex(query.capability)}\\.` } });

    const occurredAt: Record<string, string> = {};
    if (query.from) occurredAt.$gte = parseTimestamp(query.from, "from");
    if (query.to) occurredAt.$lte = parseTimestamp(query.to, "to");
    if (Object.keys(occurredAt).length > 0) conditions.push({ occurredAt });

    return conditions.length === 1 ? conditions[0]! : { $and: conditions };
}

function toActivity(event: StoredIamEvent) {
    const eventType = requiredString(event.eventType, "eventType");
    const aggregateType = requiredString(event.aggregateType, "aggregateType");
    const aggregateId = requiredString(event.aggregateId, "aggregateId");
    const occurredAt = requiredString(event.occurredAt, "occurredAt");
    const metadata = event.metadata ?? {};
    return {
        activityId: typeof event.eventId === "string" ? event.eventId : `${aggregateType}:${aggregateId}:${occurredAt}`,
        eventType,
        capability: eventType.split(".")[0] ?? "iam",
        action: humanize(eventType),
        occurredAt,
        resource: { type: aggregateType, id: aggregateId },
        actorId: optionalString(metadata.actorId),
        requestId: optionalString(metadata.requestId),
        correlationId: optionalString(metadata.correlationId),
    };
}

function humanize(eventType: string): string {
    return eventType.split(".").slice(1).join(" ").replace(/[_-]+/g, " ").trim();
}
function optionalString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}
function requiredString(value: unknown, name: string): string {
    if (typeof value !== "string" || value.length === 0) throw new Error(`IAM event ${name} is invalid.`);
    return value;
}
function parseTimestamp(value: string, name: string): string {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) throw new AccessHttpError(400, "validation_error", `Tenant IAM activity ${name} timestamp is invalid.`);
    return new Date(timestamp).toISOString();
}
function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AccessHttpError(400, "validation_error", "Tenant IAM activity pagination is invalid.");
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AccessHttpError(400, "validation_error", "Tenant IAM activity pagination is invalid.");
    return parsed;
}
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function execute(
    request: FastifyRequest,
    reply: FastifyReply,
    operation: () => Promise<unknown>,
): Promise<unknown> {
    try {
        return reply.status(200).send(await operation());
    } catch (error) {
        const membership = translateMembershipHttpError(error);
        const access = translateAccessHttpError(error);
        const translations = [
            membership,
            { statusCode: access.statusCode, body: access.toResponseBody() },
        ];
        const translated = translations.find(candidate => candidate.statusCode < 500) ?? membership;
        request.log.error({ requestId: request.id, route: "tenant-iam-activity", error }, "Tenant IAM activity lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
