// apps/server/src/bootstrap/register-provider-iam-investigation-routes.ts
// -----------------------------------------------------------------------------
// PROVIDER IAM CORRELATED INVESTIGATION & UNIFIED SEARCH
// -----------------------------------------------------------------------------
// Read-only administration intelligence over canonical IAM state/events.
// This is not an event store and does not own Identity/Membership/Access facts.
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

interface InvestigationQuery {
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly actorId?: string;
    readonly tenantId?: string;
    readonly identityId?: string;
    readonly membershipId?: string;
    readonly invitationId?: string;
    readonly offset?: string;
    readonly limit?: string;
}
interface SearchQuery {
    readonly q: string;
    readonly limit?: string;
}
interface StoredIamEvent extends Document {
    readonly eventId?: string;
    readonly eventType?: string;
    readonly aggregateType?: string;
    readonly aggregateId?: string;
    readonly occurredAt?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly payload?: Readonly<Record<string, unknown>>;
}

export function registerProviderIamInvestigationRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get<{ Querystring: InvestigationQuery }>(
        "/api/v1/admin/iam/investigation",
        async (request, reply) => execute(request, reply, async () => {
            await authorize(input, request, reply, "investigate", "investigation");
            const query = request.query;
            if (![query.requestId, query.correlationId, query.actorId, query.tenantId, query.identityId, query.membershipId, query.invitationId].some(Boolean)) {
                throw new AccessHttpError(400, "validation_error", "At least one supported IAM investigation criterion is required.");
            }
            const offset = integer(query.offset, 0, 0, 100000);
            const limit = integer(query.limit, 100, 1, 200);
            const filter = investigationFilter(query);
            const events = input.database.collection<StoredIamEvent>("engine_events");
            const [documents, total] = await Promise.all([
                events.find(filter).sort({ occurredAt: 1, eventId: 1 }).skip(offset).limit(limit).toArray(),
                events.countDocuments(filter),
            ]);
            return { items: documents.map(toActivity), total, offset, limit };
        }),
    );

    input.app.get<{ Querystring: SearchQuery }>(
        "/api/v1/admin/iam/search",
        async (request, reply) => execute(request, reply, async () => {
            await authorize(input, request, reply, "search", "search");
            const q = request.query.q?.trim();
            if (!q || q.length < 2 || q.length > 200) throw new AccessHttpError(400, "validation_error", "IAM search query must contain between 2 and 200 characters.");
            const limit = integer(request.query.limit, 25, 1, 50);
            const regex = new RegExp(escapeRegex(q), "i");
            const db = input.database;

            const [identities, memberships, invitations, roles, roleAssignments, permissionAssignments] = await Promise.all([
                db.collection("identity_users").find({ $or: [{ userId: regex }, { email: regex }] }).project({ _id: 0, userId: 1, email: 1, status: 1 }).limit(limit).toArray(),
                db.collection("membership_memberships").find({ $or: [{ membershipId: regex }, { identityId: regex }, { tenantId: regex }] }).project({ _id: 0, membershipId: 1, identityId: 1, tenantId: 1, status: 1 }).limit(limit).toArray(),
                db.collection("membership_invitations").find({ $or: [{ invitationId: regex }, { email: regex }, { tenantId: regex }] }).project({ _id: 0, invitationId: 1, email: 1, tenantId: 1, status: 1 }).limit(limit).toArray(),
                db.collection("access_roles").find({ $or: [{ roleId: regex }, { key: regex }, { name: regex }, { tenantId: regex }] }).project({ _id: 0, roleId: 1, key: 1, name: 1, tenantId: 1, status: 1 }).limit(limit).toArray(),
                db.collection("access_role_assignments").find({ $or: [{ assignmentId: regex }, { roleId: regex }, { membershipId: regex }, { identityId: regex }, { tenantId: regex }] }).project({ _id: 0, assignmentId: 1, roleId: 1, membershipId: 1, identityId: 1, tenantId: 1, status: 1 }).limit(limit).toArray(),
                db.collection("access_permission_assignments").find({ $or: [{ assignmentId: regex }, { permissionId: regex }, { membershipId: regex }, { identityId: regex }, { tenantId: regex }] }).project({ _id: 0, assignmentId: 1, permissionId: 1, membershipId: 1, identityId: 1, tenantId: 1, status: 1 }).limit(limit).toArray(),
            ]);

            const items = [
                ...identities.map(x => ({ type: "identity", id: x.userId, label: x.email ?? x.userId, status: x.status ?? null })),
                ...memberships.map(x => ({ type: "membership", id: x.membershipId, label: x.identityId, tenantId: x.tenantId, status: x.status ?? null })),
                ...invitations.map(x => ({ type: "invitation", id: x.invitationId, label: x.email ?? x.invitationId, tenantId: x.tenantId, status: x.status ?? null })),
                ...roles.map(x => ({ type: "role", id: x.roleId, label: x.name ?? x.key ?? x.roleId, tenantId: x.tenantId ?? null, status: x.status ?? null })),
                ...roleAssignments.map(x => ({ type: "role-assignment", id: x.assignmentId, label: x.roleId, tenantId: x.tenantId, membershipId: x.membershipId, identityId: x.identityId, status: x.status ?? null })),
                ...permissionAssignments.map(x => ({ type: "permission-assignment", id: x.assignmentId, label: x.permissionId, tenantId: x.tenantId, membershipId: x.membershipId, identityId: x.identityId, status: x.status ?? null })),
            ].slice(0, limit);
            return { query: q, items };
        }),
    );
}

function investigationFilter(query: InvestigationQuery): Filter<StoredIamEvent> {
    const filters: Filter<StoredIamEvent>[] = [];
    if (query.requestId) filters.push({ "metadata.requestId": query.requestId });
    if (query.correlationId) filters.push({ "metadata.correlationId": query.correlationId });
    if (query.actorId) filters.push({ "metadata.actorId": query.actorId });
    if (query.tenantId) filters.push({ $or: [{ "metadata.tenantId": query.tenantId }, { "payload.tenantId": query.tenantId }] });
    if (query.identityId) filters.push({ $or: [{ aggregateId: query.identityId }, { "payload.identityId": query.identityId }, { "payload.userId": query.identityId }] });
    if (query.membershipId) filters.push({ $or: [{ aggregateId: query.membershipId }, { "payload.membershipId": query.membershipId }] });
    if (query.invitationId) filters.push({ $or: [{ aggregateId: query.invitationId }, { "payload.invitationId": query.invitationId }] });
    return filters.length === 1 ? filters[0]! : { $and: filters };
}

async function authorize(
    input: Pick<Parameters<typeof registerProviderIamInvestigationRoutes>[0], "accessApi" | "providerSecurityResolver">,
    request: FastifyRequest,
    reply: FastifyReply,
    action: "investigate" | "search",
    id: string,
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
        resource: { type: action === "investigate" ? "investigation" : "search", id },
        membershipId: resolved.security.scope.membershipId,
        tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Provider IAM administration access is denied.");
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
        occurredAt,
        resource: { type: aggregateType, id: aggregateId },
        actorId: stringOrNull(metadata.actorId),
        tenantId: stringOrNull(metadata.tenantId),
        requestId: stringOrNull(metadata.requestId),
        correlationId: stringOrNull(metadata.correlationId),
    };
}
function required(value: unknown, field: string): string {
    if (typeof value !== "string" || !value) throw new Error(`IAM event ${field} is invalid.`);
    return value;
}
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value ? value : null; }
function integer(value: string | undefined, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AccessHttpError(400, "validation_error", "IAM administration pagination is invalid.");
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AccessHttpError(400, "validation_error", "IAM administration pagination is invalid.");
    return parsed;
}
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>): Promise<unknown> {
    try { return reply.status(200).send(await operation()); }
    catch (error) {
        const identity = translateIdentityHttpError(error);
        const ae = translateAccessHttpError(error);
        const access = { statusCode: ae.statusCode, body: ae.toResponseBody() };
        const translated = [identity, access].find(candidate => candidate.statusCode < 500) ?? identity;
        request.log.error({ requestId: request.id, route: "provider-iam-investigation", error }, "Provider IAM administration lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
