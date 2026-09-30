// apps/server/src/bootstrap/register-tenant-iam-policy-routes.ts
// -----------------------------------------------------------------------------
// TENANT IAM SETTINGS & EFFECTIVE POLICY
// -----------------------------------------------------------------------------
// Tenant-owned IAM business settings are permitted only where Provider policy
// explicitly delegates control. Canonical tenant settings never widen Provider
// policy. Effective policy is a derived read, not authoritative state.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import type { FolksdoEngine, OutboxMessage, ReplayableEvent, RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import { AccessHttpError, translateAccessHttpError, type AccessApi, type AccessApiRequestContext } from "@folksdo-identity-access/access";
import { translateMembershipHttpError, type MembershipApi, type MembershipRouteContextResolver } from "@folksdo-identity-access/membership";

const PROVIDER_COLLECTION = "iam_provider_policies";
const TENANT_COLLECTION = "iam_tenant_policies";
const PROVIDER_POLICY_ID = "provider-default";

interface Params { readonly tenantId: string; }
interface Range { readonly min: number; readonly max: number; }
interface ProviderPolicy {
    readonly policyId: string;
    readonly version: number;
    readonly authentication: { readonly passwordSignInEnabled: boolean };
    readonly sessions: { readonly maxActiveSessions: number; readonly sessionLifetimeMinutes: number };
    readonly verification: { readonly emailVerificationRequired: boolean };
    readonly invitations: { readonly defaultExpiryHours: number; readonly maxExpiryHours: number };
    readonly recovery: { readonly passwordRecoveryEnabled: boolean; readonly recoveryRequestExpiryMinutes: number };
    readonly security: { readonly suspendRevokesSessions: boolean };
    readonly tenantDelegation?: {
        readonly sessions?: { readonly maxActiveSessions?: Range; readonly sessionLifetimeMinutes?: Range };
        readonly invitations?: { readonly defaultExpiryHours?: Range };
        readonly recovery?: { readonly recoveryRequestExpiryMinutes?: Range };
    };
}
interface TenantOverrides {
    readonly sessions?: { readonly maxActiveSessions?: number; readonly sessionLifetimeMinutes?: number };
    readonly invitations?: { readonly defaultExpiryHours?: number };
    readonly recovery?: { readonly recoveryRequestExpiryMinutes?: number };
}
interface TenantPolicyState {
    readonly tenantId: string;
    readonly version: number;
    readonly providerPolicyVersion: number;
    readonly overrides: TenantOverrides;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly updatedBy: string;
}

export function registerTenantIamPolicyRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly engine: FolksdoEngine;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly contextResolver: MembershipRouteContextResolver;
}): void {
    input.app.get<{ Params: Params }>("/api/v1/tenants/:tenantId/iam/settings", async (request, reply) =>
        execute(request, reply, async () => {
            await authorize(input, request, reply, "view");
            const state = await input.database.collection<TenantPolicyState>(TENANT_COLLECTION).findOne({ tenantId: request.params.tenantId });
            if (state === null) throw new AccessHttpError(404, "not_found", "Tenant IAM settings have not been configured.");
            return publicState(state);
        }));

    input.app.put<{ Params: Params }>("/api/v1/tenants/:tenantId/iam/settings", async (request, reply) =>
        execute(request, reply, async () => {
            const resolved = await authorize(input, request, reply, "update");
            const provider = await providerPolicy(input.database);
            const overrides = parseOverrides(request.body);
            assertWithinDelegation(overrides, provider);
            const existing = await input.database.collection<TenantPolicyState>(TENANT_COLLECTION).findOne({ tenantId: request.params.tenantId });
            const now = new Date().toISOString();
            const state: TenantPolicyState = {
                tenantId: request.params.tenantId,
                version: (existing?.version ?? 0) + 1,
                providerPolicyVersion: provider.version,
                overrides,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
                updatedBy: resolved.context.actor.actorId,
            };
            const record: Readonly<Record<string, unknown>> = { ...state };
            const change: StateChange = existing === null
                ? { operation: "insert", collection: TENANT_COLLECTION, document: record }
                : { operation: "update", collection: TENANT_COLLECTION, key: { tenantId: state.tenantId }, patch: record };
            const metadata = eventMetadata(resolved.context);
            const payload = { tenantId: state.tenantId, version: state.version, providerPolicyVersion: provider.version, updatedBy: state.updatedBy };
            const event = {
                eventId: `event_${randomUUID()}`, aggregateType: "iam.tenant-policy", aggregateId: state.tenantId,
                eventType: "iam.tenant-policy.updated", version: 1, occurredAt: now, payload, metadata,
            } as ReplayableEvent;
            const outbox = {
                messageId: `outbox_${randomUUID()}`, subject: "iam.tenant_policy.updated",
                occurredAt: now, payload, metadata,
            } as OutboxMessage;
            await input.engine.state.commit({
                context: resolved.context,
                aggregate: { aggregateType: "iam.tenant-policy", aggregateId: state.tenantId },
                stateChanges: [change], events: [event], outbox: [outbox],
            });
            return publicState(state);
        }));

    input.app.get<{ Params: Params }>("/api/v1/tenants/:tenantId/iam/effective-policy", async (request, reply) =>
        execute(request, reply, async () => {
            await authorize(input, request, reply, "view");
            const provider = await providerPolicy(input.database);
            const tenant = await input.database.collection<TenantPolicyState>(TENANT_COLLECTION).findOne({ tenantId: request.params.tenantId });
            const overrides = effectiveOverrides(tenant?.overrides ?? {}, provider);
            return {
                tenantId: request.params.tenantId,
                providerPolicyVersion: provider.version,
                tenantPolicyVersion: tenant?.version ?? null,
                authentication: provider.authentication,
                sessions: { ...provider.sessions, ...overrides.sessions },
                verification: provider.verification,
                invitations: { ...provider.invitations, ...overrides.invitations },
                recovery: { ...provider.recovery, ...overrides.recovery },
                security: provider.security,
            };
        }));
}

async function authorize(
    input: Pick<Parameters<typeof registerTenantIamPolicyRoutes>[0], "membershipApi" | "accessApi" | "contextResolver">,
    request: FastifyRequest<{ Params: Params }>, reply: FastifyReply, action: "view" | "update",
) {
    const context = await input.contextResolver.resolve({ request, reply });
    const tenantId = request.params.tenantId;
    const memberships = await input.membershipApi.listTenantMemberships(tenantId, context);
    const membership = memberships.find(item => item.identityId === context.actor.actorId && item.status === "active");
    if (membership === undefined) throw new AccessHttpError(403, "access_denied", "Active tenant Membership is required.");
    const accessContext: AccessApiRequestContext = {
        requestId: context.requestId, correlationId: context.correlationId, causationId: context.causationId,
        actor: { actorId: context.actor.actorId, actorType: "identity" },
        tenant: { tenantId, tenantType: "tenant" }, membershipId: membership.membershipId, permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: `iam.${action}`, resource: { type: "tenant-policy", id: tenantId },
        membershipId: membership.membershipId, tenantId,
    }, accessContext);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Tenant IAM settings access is denied.");
    return { context };
}

async function providerPolicy(database: Db): Promise<ProviderPolicy> {
    const policy = await database.collection<ProviderPolicy>(PROVIDER_COLLECTION).findOne({ policyId: PROVIDER_POLICY_ID });
    if (policy === null) throw new AccessHttpError(409, "policy_not_configured", "Provider IAM policy must be configured first.");
    return policy;
}

function parseOverrides(value: unknown): TenantOverrides {
    const root = object(value, "settings");
    exactOptional(root, ["sessions", "invitations", "recovery"], "settings");
    const result: { sessions?: TenantOverrides["sessions"]; invitations?: TenantOverrides["invitations"]; recovery?: TenantOverrides["recovery"] } = {};
    if (root.sessions !== undefined) {
        const value = object(root.sessions, "settings.sessions"); exactOptional(value, ["maxActiveSessions", "sessionLifetimeMinutes"], "settings.sessions");
        result.sessions = {
            ...(value.maxActiveSessions === undefined ? {} : { maxActiveSessions: integer(value.maxActiveSessions, 1, 100, "settings.sessions.maxActiveSessions") }),
            ...(value.sessionLifetimeMinutes === undefined ? {} : { sessionLifetimeMinutes: integer(value.sessionLifetimeMinutes, 5, 43200, "settings.sessions.sessionLifetimeMinutes") }),
        };
    }
    if (root.invitations !== undefined) {
        const value = object(root.invitations, "settings.invitations"); exactOptional(value, ["defaultExpiryHours"], "settings.invitations");
        result.invitations = {
            ...(value.defaultExpiryHours === undefined ? {} : { defaultExpiryHours: integer(value.defaultExpiryHours, 1, 2160, "settings.invitations.defaultExpiryHours") }),
        };
    }
    if (root.recovery !== undefined) {
        const value = object(root.recovery, "settings.recovery"); exactOptional(value, ["recoveryRequestExpiryMinutes"], "settings.recovery");
        result.recovery = {
            ...(value.recoveryRequestExpiryMinutes === undefined ? {} : { recoveryRequestExpiryMinutes: integer(value.recoveryRequestExpiryMinutes, 5, 1440, "settings.recovery.recoveryRequestExpiryMinutes") }),
        };
    }
    return result;
}
function effectiveOverrides(overrides: TenantOverrides, provider: ProviderPolicy): TenantOverrides {
    const delegation = provider.tenantDelegation ?? {};
    const within = (value: number | undefined, allowed: Range | undefined) =>
        value !== undefined && allowed !== undefined && value >= allowed.min && value <= allowed.max;
    return {
        ...(within(overrides.sessions?.maxActiveSessions, delegation.sessions?.maxActiveSessions)
            ? { sessions: { maxActiveSessions: overrides.sessions!.maxActiveSessions } } : {}),
        ...(within(overrides.sessions?.sessionLifetimeMinutes, delegation.sessions?.sessionLifetimeMinutes)
            ? { sessions: {
                ...(within(overrides.sessions?.maxActiveSessions, delegation.sessions?.maxActiveSessions)
                    ? { maxActiveSessions: overrides.sessions!.maxActiveSessions } : {}),
                sessionLifetimeMinutes: overrides.sessions!.sessionLifetimeMinutes,
            } } : {}),
        ...(within(overrides.invitations?.defaultExpiryHours, delegation.invitations?.defaultExpiryHours)
            && overrides.invitations!.defaultExpiryHours! <= provider.invitations.maxExpiryHours
            ? { invitations: { defaultExpiryHours: overrides.invitations!.defaultExpiryHours } } : {}),
        ...(within(overrides.recovery?.recoveryRequestExpiryMinutes, delegation.recovery?.recoveryRequestExpiryMinutes)
            ? { recovery: { recoveryRequestExpiryMinutes: overrides.recovery!.recoveryRequestExpiryMinutes } } : {}),
    };
}

function assertWithinDelegation(overrides: TenantOverrides, provider: ProviderPolicy): void {
    const delegation = provider.tenantDelegation ?? {};
    check(overrides.sessions?.maxActiveSessions, delegation.sessions?.maxActiveSessions, "sessions.maxActiveSessions");
    check(overrides.sessions?.sessionLifetimeMinutes, delegation.sessions?.sessionLifetimeMinutes, "sessions.sessionLifetimeMinutes");
    check(overrides.invitations?.defaultExpiryHours, delegation.invitations?.defaultExpiryHours, "invitations.defaultExpiryHours");
    check(overrides.recovery?.recoveryRequestExpiryMinutes, delegation.recovery?.recoveryRequestExpiryMinutes, "recovery.recoveryRequestExpiryMinutes");
    if (overrides.invitations?.defaultExpiryHours !== undefined && overrides.invitations.defaultExpiryHours > provider.invitations.maxExpiryHours)
        invalid("invitations.defaultExpiryHours exceeds Provider invitations.maxExpiryHours.");
}
function check(value: number | undefined, allowed: Range | undefined, field: string): void {
    if (value === undefined) return;
    if (allowed === undefined) invalid(`${field} is not delegated by Provider IAM policy.`);
    if (value < allowed.min || value > allowed.max) invalid(`${field} must be between Provider-delegated bounds ${allowed.min} and ${allowed.max}.`);
}
function object(value: unknown, field: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(`${field} must be an object.`);
    return value as Record<string, unknown>;
}
function exactOptional(value: Record<string, unknown>, fields: readonly string[], path: string): void {
    const allowed = new Set(fields); const unknown = Object.keys(value).find(key => !allowed.has(key));
    if (unknown) invalid(`${path}.${unknown} is not a supported Tenant IAM setting.`);
}
function integer(value: unknown, min: number, max: number, field: string): number {
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) invalid(`${field} must be an integer between ${min} and ${max}.`);
    return value as number;
}
function invalid(message: string): never { throw new AccessHttpError(400, "validation_error", message); }
function publicState(state: TenantPolicyState) { const { _id: _ignored, ...safe } = state as TenantPolicyState & { _id?: unknown }; return safe; }
function eventMetadata(c: RuntimeContext): Readonly<Record<string, unknown>> {
    return { requestId: c.requestId, correlationId: c.correlationId, causationId: c.causationId, actorId: c.actor.actorId, actorType: c.actor.actorType, tenantId: c.tenant.tenantId, tenantType: c.tenant.tenantType };
}
async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>): Promise<unknown> {
    try { return reply.status(200).send(await operation()); }
    catch (error) {
        const membership = translateMembershipHttpError(error); const accessError = translateAccessHttpError(error);
        const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() };
        const translated = [membership, access].find(candidate => candidate.statusCode < 500) ?? membership;
        request.log.error({ requestId: request.id, route: "tenant-iam-policy", error }, "Tenant IAM policy operation failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
