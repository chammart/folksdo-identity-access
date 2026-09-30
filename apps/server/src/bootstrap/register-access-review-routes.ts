// apps/server/src/bootstrap/register-access-review-routes.ts
// -----------------------------------------------------------------------------
// ACCESS REVIEWS
// -----------------------------------------------------------------------------
// Canonical Access-owned governance lifecycle. Reviews snapshot Access facts,
// retain reviewer decisions/history, and delegate revocation to existing Access
// assignment operations. Review state never becomes authorization authority.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import type { FolksdoEngine, OutboxMessage, ReplayableEvent, RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import {
    AccessHttpError, translateAccessHttpError, isPrivilegedPermission, isPrivilegedRole,
    type AccessApi, type AccessApiRequestContext, type AccessApiRequestContextResolver,
} from "@folksdo-identity-access/access";

const COLLECTION = "access_reviews";
type ReviewStatus = "open" | "completed";
type ReviewKind = "access" | "privileged";
type ItemType = "role_assignment" | "permission_assignment";
type Decision = "confirm" | "revoke";
interface ReviewItem {
    readonly itemId: string; readonly itemType: ItemType; readonly assignmentId: string;
    readonly membershipId?: string; readonly identityId?: string; readonly roleId?: string;
    readonly permissionId?: string; readonly privileged: boolean;
    readonly decision?: Decision; readonly decidedBy?: string; readonly decidedAt?: string; readonly reason?: string;
}
interface ReviewState {
    readonly reviewId: string; readonly tenantId: string; readonly name: string; readonly kind: ReviewKind;
    readonly status: ReviewStatus; readonly items: readonly ReviewItem[];
    readonly createdBy: string; readonly createdAt: string; readonly updatedAt: string;
    readonly completedAt?: string;
}
interface ReviewParams { readonly reviewId: string; }
interface ItemParams extends ReviewParams { readonly itemId: string; }

export function registerAccessReviewRoutes(input: {
    readonly app: FastifyInstance; readonly database: Db; readonly engine: FolksdoEngine;
    readonly accessApi: AccessApi; readonly contextResolver: AccessApiRequestContextResolver;
}): void {
    input.app.post("/api/v1/access/reviews", async (request, reply) => execute(request, reply, 201, async () => {
        const context = await input.contextResolver.resolve(request);
        await authorize(input.accessApi, context, "create");
        const body = object(request.body, "review"); exact(body, ["name", "kind"], "review");
        const name = string(body.name, "review.name", 1, 160);
        const kind = enumeration(body.kind, ["access", "privileged"] as const, "review.kind");
        const tenantId = context.tenant?.tenantId;
        if (tenantId === undefined || context.membershipId === undefined) denied("Tenant Access context is required.");
        const [roles, roleAssignments, permissions, permissionAssignments] = await Promise.all([
            input.accessApi.listRoles({ tenantId, status: "active", offset: 0, limit: 100 } as never, context),
            input.accessApi.listRoleAssignments({ tenantId, status: "active", offset: 0, limit: 100 } as never, context),
            input.accessApi.listPermissions({ status: "active", offset: 0, limit: 100 } as never, context),
            input.accessApi.listPermissionAssignments({ tenantId, status: "active", offset: 0, limit: 100 } as never, context),
        ]);
        const privilegedPermissionIds = new Set(permissions.items.filter(permission => isPrivilegedPermission(permission as never)).map(permission => permission.permissionId));
        const privilegedRoleIds = new Set(roles.items.filter(role => isPrivilegedRole(role as never, permissions.items as never)).map(role => role.roleId));
        const items: ReviewItem[] = [
            ...roleAssignments.items.map(a => ({
                itemId: `item_${randomUUID()}`, itemType: "role_assignment" as const, assignmentId: a.assignmentId,
                membershipId: a.membershipId, identityId: a.identityId, roleId: a.roleId, privileged: privilegedRoleIds.has(a.roleId),
            })),
            ...permissionAssignments.items.map(a => ({
                itemId: `item_${randomUUID()}`, itemType: "permission_assignment" as const, assignmentId: a.assignmentId,
                membershipId: a.membershipId, identityId: a.identityId, permissionId: a.permissionId, privileged: privilegedPermissionIds.has(a.permissionId),
            })),
        ].filter(item => kind === "access" || item.privileged);
        const now = new Date().toISOString();
        const state: ReviewState = {
            reviewId: `review_${randomUUID()}`, tenantId, name, kind, status: "open", items,
            createdBy: context.actor.actorId, createdAt: now, updatedAt: now,
        };
        await commit(input.engine, context, null, state, "access.review.created", "access.review.created",
            { reviewId: state.reviewId, tenantId, kind, itemCount: items.length });
        return state;
    }));

    input.app.get<{ Params: ReviewParams }>("/api/v1/access/reviews/:reviewId", async (request, reply) => execute(request, reply, 200, async () => {
        const context = await input.contextResolver.resolve(request); await authorize(input.accessApi, context, "view");
        return await getReview(input.database, request.params.reviewId, context);
    }));

    input.app.post<{ Params: ItemParams }>("/api/v1/access/reviews/:reviewId/items/:itemId/decision", async (request, reply) => execute(request, reply, 200, async () => {
        const context = await input.contextResolver.resolve(request); await authorize(input.accessApi, context, "decide");
        const review = await getReview(input.database, request.params.reviewId, context);
        if (review.status !== "open") conflict("Access review is already completed.");
        const body = object(request.body, "decision"); exact(body, ["decision", "reason"], "decision");
        const decision = enumeration(body.decision, ["confirm", "revoke"] as const, "decision.decision");
        const reason = string(body.reason, "decision.reason", 1, 500);
        const index = review.items.findIndex(item => item.itemId === request.params.itemId);
        if (index < 0) throw new AccessHttpError(404, "not_found", "Access review item was not found.");
        const current = review.items[index]!;
        if (current.decision !== undefined) {
            if (current.decision === decision && current.reason === reason) return review;
            conflict("Access review item already has a decision.");
        }
        if (decision === "revoke") {
            if (current.itemType === "role_assignment") {
                await input.accessApi.removeRole({ assignmentId: current.assignmentId, reason } as never, context);
            } else {
                await input.accessApi.revokePermission({ assignmentId: current.assignmentId, reason } as never, context);
            }
        }
        const now = new Date().toISOString();
        const items = review.items.map((item, itemIndex) => itemIndex === index
            ? { ...item, decision, reason, decidedBy: context.actor.actorId, decidedAt: now } : item);
        const updated: ReviewState = { ...review, items, updatedAt: now };
        await commit(input.engine, context, review, updated, "access.review.item_decided", "access.review.item_decided",
            { reviewId: review.reviewId, itemId: current.itemId, assignmentId: current.assignmentId, decision, reason, decidedBy: context.actor.actorId });
        return updated;
    }));

    input.app.post<{ Params: ReviewParams }>("/api/v1/access/reviews/:reviewId/complete", async (request, reply) => execute(request, reply, 200, async () => {
        const context = await input.contextResolver.resolve(request); await authorize(input.accessApi, context, "complete");
        const review = await getReview(input.database, request.params.reviewId, context);
        if (review.status === "completed") return review;
        if (review.items.some(item => item.decision === undefined)) conflict("All Access review items require a decision before completion.");
        const now = new Date().toISOString();
        const updated: ReviewState = { ...review, status: "completed", completedAt: now, updatedAt: now };
        await commit(input.engine, context, review, updated, "access.review.completed", "access.review.completed",
            { reviewId: review.reviewId, tenantId: review.tenantId, completedBy: context.actor.actorId, itemCount: review.items.length });
        return updated;
    }));
}

async function getReview(database: Db, reviewId: string, context: AccessApiRequestContext): Promise<ReviewState> {
    const review = await database.collection<ReviewState>(COLLECTION).findOne({ reviewId });
    if (review === null) throw new AccessHttpError(404, "not_found", "Access review was not found.");
    if (context.tenant?.tenantId !== review.tenantId) denied("Access review belongs to another tenant.");
    const { _id: _ignored, ...safe } = review as ReviewState & { _id?: unknown }; return safe;
}
async function authorize(api: AccessApi, context: AccessApiRequestContext, action: "create" | "view" | "decide" | "complete") {
    if (context.membershipId === undefined || context.tenant?.tenantId === undefined) denied("Tenant Access context is required.");
    const decision = await api.authorize({
        action: `access.${action}`, resource: { type: "review", id: context.tenant.tenantId },
        membershipId: context.membershipId, tenantId: context.tenant.tenantId,
    }, context);
    if (!decision.allowed) denied(`Access review ${action} is denied.`);
}
async function commit(engine: FolksdoEngine, context: AccessApiRequestContext, previous: ReviewState | null, state: ReviewState, eventType: string, subject: string, payload: Readonly<Record<string, unknown>>) {
    const metadata = eventMetadata(context);
    const record: Readonly<Record<string, unknown>> = { ...state };
    const change: StateChange = previous === null
        ? { operation: "insert", collection: COLLECTION, document: record }
        : { operation: "update", collection: COLLECTION, key: { reviewId: state.reviewId }, patch: record };
    const now = state.updatedAt;
    const event = { eventId: `event_${randomUUID()}`, aggregateType: "access.review", aggregateId: state.reviewId, eventType, version: 1, occurredAt: now, payload, metadata } as ReplayableEvent;
    const outbox = { messageId: `outbox_${randomUUID()}`, subject, occurredAt: now, payload, metadata } as OutboxMessage;
    const runtimeContext: RuntimeContext = {
        requestId: context.requestId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        actor: {
            actorId: context.actor.actorId,
            actorType: "user",
        },
        tenant: {
            tenantId: state.tenantId,
            tenantType: "customer",
        },
        permissions: context.permissions ?? [],
    };
    await engine.state.commit({ context: runtimeContext, aggregate: { aggregateType: "access.review", aggregateId: state.reviewId }, stateChanges: [change], events: [event], outbox: [outbox] });
}
function eventMetadata(c: AccessApiRequestContext): Readonly<Record<string, unknown>> { return { requestId: c.requestId, correlationId: c.correlationId, causationId: c.causationId, actorId: c.actor.actorId, actorType: c.actor.actorType, tenantId: c.tenant?.tenantId, tenantType: c.tenant?.tenantType }; }
function object(value: unknown, field: string): Record<string, unknown> { if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(`${field} must be an object.`); return value as Record<string, unknown>; }
function exact(value: Record<string, unknown>, fields: readonly string[], path: string): void { const allowed = new Set(fields); const unknown = Object.keys(value).find(k => !allowed.has(k)); if (unknown) invalid(`${path}.${unknown} is not supported.`); for (const field of fields) if (!(field in value)) invalid(`${path}.${field} is required.`); }
function string(value: unknown, field: string, min: number, max: number): string { if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) invalid(`${field} is invalid.`); return value.trim(); }
function enumeration<const T extends readonly string[]>(value: unknown, values: T, field: string): T[number] { if (typeof value !== "string" || !values.includes(value)) invalid(`${field} is invalid.`); return value as T[number]; }
function invalid(message: string): never { throw new AccessHttpError(400, "validation_error", message); }
function denied(message: string): never { throw new AccessHttpError(403, "access_denied", message); }
function conflict(message: string): never { throw new AccessHttpError(409, "conflict", message); }
async function execute(request: FastifyRequest, reply: FastifyReply, status: number, operation: () => Promise<unknown>): Promise<unknown> {
    try { return reply.status(status).send(await operation()); } catch (error) {
        const translated = translateAccessHttpError(error);
        request.log.error({ requestId: request.id, route: "access-review", error }, "Access review operation failed.");
        return reply.status(translated.statusCode).send(translated.toResponseBody());
    }
}
