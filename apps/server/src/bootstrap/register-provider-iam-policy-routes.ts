// apps/server/src/bootstrap/register-provider-iam-policy-routes.ts
// -----------------------------------------------------------------------------
// PROVIDER IAM POLICY
// -----------------------------------------------------------------------------
// Provider-owned IAM business configuration. This boundary intentionally does
// not represent secrets, credentials, endpoints or infrastructure settings.
// Canonical policy changes commit state + event + outbox atomically.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import type { FolksdoEngine, OutboxMessage, ReplayableEvent, RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import { AccessHttpError, translateAccessHttpError, type AccessApi, type AccessApiRequestContext } from "@folksdo-identity-access/access";
import { translateIdentityHttpError, type IdentityProviderReadSecurityResolver } from "@folksdo-identity-access/identity";

const POLICY_ID = "provider-default";
const COLLECTION = "iam_provider_policies";
const OUTBOX_SUBJECT = "iam.provider_policy.updated";

type PolicyStatus = "active";
interface ProviderIamPolicyState {
    readonly policyId: string;
    readonly version: number;
    readonly status: PolicyStatus;
    readonly authentication: { readonly passwordSignInEnabled: boolean };
    readonly sessions: { readonly maxActiveSessions: number; readonly sessionLifetimeMinutes: number };
    readonly verification: { readonly emailVerificationRequired: boolean };
    readonly invitations: { readonly defaultExpiryHours: number; readonly maxExpiryHours: number };
    readonly recovery: { readonly passwordRecoveryEnabled: boolean; readonly recoveryRequestExpiryMinutes: number };
    readonly security: { readonly suspendRevokesSessions: boolean };
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly updatedBy: string;
}
type PolicyInput = Omit<ProviderIamPolicyState, "policyId" | "version" | "status" | "createdAt" | "updatedAt" | "updatedBy">;

export function registerProviderIamPolicyRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly engine: FolksdoEngine;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get("/api/v1/admin/iam/policy", async (request, reply) => execute(request, reply, async () => {
        await authorize(input, request, reply, "view");
        const policy = await input.database.collection<ProviderIamPolicyState>(COLLECTION).findOne({ policyId: POLICY_ID });
        if (policy === null) throw new AccessHttpError(404, "not_found", "Provider IAM policy has not been configured.");
        return toPublic(policy);
    }));

    input.app.put("/api/v1/admin/iam/policy", async (request, reply) => execute(request, reply, async () => {
        const resolved = await authorize(input, request, reply, "update");
        const policyInput = parsePolicy(request.body);
        const existing = await input.database.collection<ProviderIamPolicyState>(COLLECTION).findOne({ policyId: POLICY_ID });
        const now = new Date().toISOString();
        const policy: ProviderIamPolicyState = {
            policyId: POLICY_ID,
            version: (existing?.version ?? 0) + 1,
            status: "active",
            ...policyInput,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            updatedBy: resolved.context.actor.actorId,
        };
        const context = resolved.context;
        const metadata = eventMetadata(context);
        const payload = { policyId: policy.policyId, version: policy.version, status: policy.status, updatedBy: policy.updatedBy };
        const policyRecord: Readonly<Record<string, unknown>> = {
            ...policy,
        };
        const stateChange: StateChange = existing === null
            ? { operation: "insert", collection: COLLECTION, document: policyRecord }
            : { operation: "update", collection: COLLECTION, key: { policyId: POLICY_ID }, patch: policyRecord };
        const event: ReplayableEvent = {
            eventId: `event_${randomUUID()}`,
            aggregateType: "iam.provider-policy",
            aggregateId: POLICY_ID,
            eventType: "iam.provider-policy.updated",
            version: 1,
            occurredAt: now,
            payload,
            metadata,
        } as ReplayableEvent;
        const outbox: OutboxMessage = {
            messageId: `outbox_${randomUUID()}`,
            subject: OUTBOX_SUBJECT,
            occurredAt: now,
            payload,
            metadata,
        } as OutboxMessage;
        await input.engine.state.commit({
            context,
            aggregate: { aggregateType: "iam.provider-policy", aggregateId: POLICY_ID },
            stateChanges: [stateChange],
            events: [event],
            outbox: [outbox],
        });
        return toPublic(policy);
    }));
}

async function authorize(input: Pick<Parameters<typeof registerProviderIamPolicyRoutes>[0], "accessApi" | "providerSecurityResolver">, request: FastifyRequest, reply: FastifyReply, action: "view" | "update") {
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
    const decision = await input.accessApi.authorize({ action: `iam.${action}`, resource: { type: "policy", id: POLICY_ID }, membershipId: resolved.security.scope.membershipId, tenantId: resolved.security.scope.tenantId }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "Provider IAM policy access is denied.");
    return resolved;
}

function parsePolicy(value: unknown): PolicyInput {
    const root = object(value, "policy");
    exact(root, ["authentication", "sessions", "verification", "invitations", "recovery", "security"], "policy");
    const authentication = object(root.authentication, "authentication"); exact(authentication, ["passwordSignInEnabled"], "authentication");
    const sessions = object(root.sessions, "sessions"); exact(sessions, ["maxActiveSessions", "sessionLifetimeMinutes"], "sessions");
    const verification = object(root.verification, "verification"); exact(verification, ["emailVerificationRequired"], "verification");
    const invitations = object(root.invitations, "invitations"); exact(invitations, ["defaultExpiryHours", "maxExpiryHours"], "invitations");
    const recovery = object(root.recovery, "recovery"); exact(recovery, ["passwordRecoveryEnabled", "recoveryRequestExpiryMinutes"], "recovery");
    const security = object(root.security, "security"); exact(security, ["suspendRevokesSessions"], "security");
    const result: PolicyInput = {
        authentication: { passwordSignInEnabled: bool(authentication.passwordSignInEnabled, "authentication.passwordSignInEnabled") },
        sessions: { maxActiveSessions: integer(sessions.maxActiveSessions, 1, 100, "sessions.maxActiveSessions"), sessionLifetimeMinutes: integer(sessions.sessionLifetimeMinutes, 5, 43200, "sessions.sessionLifetimeMinutes") },
        verification: { emailVerificationRequired: bool(verification.emailVerificationRequired, "verification.emailVerificationRequired") },
        invitations: { defaultExpiryHours: integer(invitations.defaultExpiryHours, 1, 720, "invitations.defaultExpiryHours"), maxExpiryHours: integer(invitations.maxExpiryHours, 1, 2160, "invitations.maxExpiryHours") },
        recovery: { passwordRecoveryEnabled: bool(recovery.passwordRecoveryEnabled, "recovery.passwordRecoveryEnabled"), recoveryRequestExpiryMinutes: integer(recovery.recoveryRequestExpiryMinutes, 5, 1440, "recovery.recoveryRequestExpiryMinutes") },
        security: { suspendRevokesSessions: bool(security.suspendRevokesSessions, "security.suspendRevokesSessions") },
    };
    if (result.invitations.defaultExpiryHours > result.invitations.maxExpiryHours) invalid("invitations.defaultExpiryHours must not exceed invitations.maxExpiryHours.");
    return result;
}
function object(value: unknown, field: string): Record<string, unknown> { if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(`${field} must be an object.`); return value as Record<string, unknown>; }
function exact(value: Record<string, unknown>, fields: readonly string[], path: string): void { const allowed = new Set(fields); const unknown = Object.keys(value).find(key => !allowed.has(key)); if (unknown) invalid(`${path}.${unknown} is not a supported Provider IAM business-policy field.`); for (const field of fields) if (!(field in value)) invalid(`${path}.${field} is required.`); }
function bool(value: unknown, field: string): boolean { if (typeof value !== "boolean") invalid(`${field} must be a boolean.`); return value as boolean; }
function integer(value: unknown, min: number, max: number, field: string): number { if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) invalid(`${field} must be an integer between ${min} and ${max}.`); return value as number; }
function invalid(message: string): never { throw new AccessHttpError(400, "validation_error", message); }
function eventMetadata(c: RuntimeContext): Readonly<Record<string, unknown>> { return { requestId: c.requestId, correlationId: c.correlationId, causationId: c.causationId, actorId: c.actor.actorId, actorType: c.actor.actorType, tenantId: c.tenant.tenantId, tenantType: c.tenant.tenantType }; }
function toPublic(policy: ProviderIamPolicyState) { const { _id: _ignored, ...safe } = policy as ProviderIamPolicyState & { _id?: unknown }; return safe; }
async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>): Promise<unknown> { try { return reply.status(200).send(await operation()); } catch (error) { const identity = translateIdentityHttpError(error); const accessError = translateAccessHttpError(error); const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() }; const translated = [identity, access].find(candidate => candidate.statusCode < 500) ?? identity; request.log.error({ requestId: request.id, route: "provider-iam-policy", error }, "Provider IAM policy operation failed."); return reply.status(translated.statusCode).send(translated.body); } }
