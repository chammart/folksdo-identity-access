// apps/server/src/bootstrap/register-provider-iam-activity-routes.ts
// -----------------------------------------------------------------------------
// PROVIDER IAM ACTIVITY & LIFECYCLE TIMELINES
// -----------------------------------------------------------------------------
// Provider-authorized administration intelligence over canonical engine events.
// No duplicate event store. Raw payload and metadata are never exposed.
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
    translateIdentityHttpError,
    type IdentityProviderReadSecurityResolver,
} from "@folksdo-identity-access/identity";

interface StoredIamEvent extends Document {
    readonly eventId?: string;
    readonly eventType?: string;
    readonly aggregateType?: string;
    readonly aggregateId?: string;
    readonly occurredAt?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

interface ProviderActivityQuery {
    readonly tenantId?: string;
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
interface TimelineParams {
    readonly resourceType: "identity" | "membership" | "invitation" | "role" | "assignment";
    readonly resourceId: string;
}

const RESOURCE_AGGREGATES: Readonly<Record<TimelineParams["resourceType"], readonly string[]>> = {
    identity: ["identity.user"],
    membership: ["membership.membership"],
    invitation: ["membership.invitation"],
    role: ["access.role"],
    assignment: ["access.role-assignment", "access.permission-assignment"],
};

export function registerProviderIamActivityRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get<{ Querystring: ProviderActivityQuery }>(
        "/api/v1/admin/iam/activity",
        async (request, reply) => execute(request, reply, async () => {
            const resolved = await authorize(input, request, reply, "provider-list", "activity");
            const offset = parseInteger(request.query.offset, 0, 0, 100000);
            const limit = parseInteger(request.query.limit, 50, 1, 100);
            const filter = buildProviderFilter(request.query);
            const events = input.database.collection<StoredIamEvent>("engine_events");
            const [items, total] = await Promise.all([
                events.find(filter).sort({ occurredAt: -1, eventId: -1 }).skip(offset).limit(limit).toArray(),
                events.countDocuments(filter),
            ]);
            return { items: items.map(toActivity), total, offset, limit, scope: "provider" };
        }),
    );

    input.app.get<{ Params: TimelineParams }>(
        "/api/v1/admin/iam/timelines/:resourceType/:resourceId",
        async (request, reply) => execute(request, reply, async () => {
            const aggregateTypes = RESOURCE_AGGREGATES[request.params.resourceType];
            if (!aggregateTypes) throw new AccessHttpError(400, "validation_error", "Unsupported IAM timeline resource type.");
            await authorize(input, request, reply, "timeline-view", request.params.resourceId);
            const events = await input.database.collection<StoredIamEvent>("engine_events")
                .find({
                    aggregateId: request.params.resourceId,
                    aggregateType: { $in: [...aggregateTypes] },
                })
                .sort({ occurredAt: 1, eventId: 1 })
                .toArray();
            return {
                resource: { type: request.params.resourceType, id: request.params.resourceId },
                items: events.map(toActivity),
            };
        }),
    );
}

async function authorize(
    input: Pick<Parameters<typeof registerProviderIamActivityRoutes>[0], "accessApi" | "providerSecurityResolver">,
    request: FastifyRequest,
    reply: FastifyReply,
    action: "provider-list" | "timeline-view",
    resourceId: string,
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
        action: `iam.${action}`,
        resource: { type: action === "provider-list" ? "activity" : "timeline", id: resourceId },
        membershipId: resolved.security.scope.membershipId,
        tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Provider IAM investigation access is denied.");
    return resolved;
}

function buildProviderFilter(query: ProviderActivityQuery): Filter<StoredIamEvent> {
    const filters: Filter<StoredIamEvent>[] = [];
    if (query.tenantId) filters.push({ $or: [{ "metadata.tenantId": query.tenantId }, { "payload.tenantId": query.tenantId }] });
    if (query.capability) filters.push({ eventType: { $regex: `^${escapeRegex(query.capability)}\\.` } });
    if (query.eventType) filters.push({ eventType: query.eventType });
    if (query.actorId) filters.push({ "metadata.actorId": query.actorId });
    if (query.requestId) filters.push({ "metadata.requestId": query.requestId });
    if (query.correlationId) filters.push({ "metadata.correlationId": query.correlationId });
    const occurredAt: Record<string, string> = {};
    if (query.from) occurredAt.$gte = timestamp(query.from, "from");
    if (query.to) occurredAt.$lte = timestamp(query.to, "to");
    if (Object.keys(occurredAt).length) filters.push({ occurredAt });
    return filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { $and: filters };
}

function toActivity(event: StoredIamEvent) {
    const eventType = required(event.eventType, "eventType");
    const aggregateType = required(event.aggregateType, "aggregateType");
    const aggregateId = required(event.aggregateId, "aggregateId");
    const occurredAt = required(event.occurredAt, "occurredAt");
    const metadata = event.metadata ?? {};
    return {
        activityId: typeof event.eventId === "string" ? event.eventId : `${aggregateType}:${aggregateId}:${occurredAt}`,
        eventType,
        capability: eventType.split(".")[0] ?? "iam",
        action: eventType.split(".").slice(1).join(" ").replace(/[_-]+/g, " ").trim(),
        occurredAt,
        resource: { type: aggregateType, id: aggregateId },
        actorId: optional(metadata.actorId),
        tenantId: optional(metadata.tenantId),
        requestId: optional(metadata.requestId),
        correlationId: optional(metadata.correlationId),
    };
}
function optional(value: unknown): string | null { return typeof value === "string" && value.length ? value : null; }
function required(value: unknown, field: string): string {
    if (typeof value !== "string" || !value) throw new Error(`IAM event ${field} is invalid.`);
    return value;
}
function timestamp(value: string, field: string): string {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new AccessHttpError(400, "validation_error", `Provider IAM activity ${field} timestamp is invalid.`);
    return new Date(parsed).toISOString();
}
function parseInteger(value: string | undefined, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AccessHttpError(400, "validation_error", "Provider IAM activity pagination is invalid.");
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AccessHttpError(400, "validation_error", "Provider IAM activity pagination is invalid.");
    return parsed;
}
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>): Promise<unknown> {
    try {
        return reply.status(200).send(await operation());
    } catch (error) {
        const identity = translateIdentityHttpError(error);
        const accessError = translateAccessHttpError(error);
        const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() };
        const translated = [identity, access].find(candidate => candidate.statusCode < 500) ?? identity;
        request.log.error({ requestId: request.id, route: "provider-iam-activity", error }, "Provider IAM investigation lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
