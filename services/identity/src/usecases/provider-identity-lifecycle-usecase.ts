// services/identity/src/usecases/provider-identity-lifecycle-usecase.ts
// -----------------------------------------------------------------------------
// PROVIDER IDENTITY LIFECYCLE ADMINISTRATION
// -----------------------------------------------------------------------------
// Identity-owned suspension/reactivation. Suspension revokes active sessions and
// publishes the established Identity lifecycle facts consumed by Access.
// Reactivation restores eligibility only; revoked sessions are never restored.
// -----------------------------------------------------------------------------

import type { Clock } from "@folksdo-engine/foundation";
import type { FolksdoEngine, OutboxMessage, ReplayableEvent, RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import type { BetterAuthIdentityAdapter } from "../adapters";
import { identityPermissions, type IdentityAuthorization, type IdentityPlatformAuthorizationScope } from "../authorization";
import { IdentityCommitFailedError, IdentityUserNotFoundError, InvalidIdentityLifecycleTransitionError } from "../errors";
import type { IdentityAdministrationSessionReadStore, IdentityReadStore } from "../read-store";
import type { IdentitySessionState, IdentityUserState } from "../state";
import type { IdentityCollections, IdentityIdGenerator, IdentityOutboxSubjects } from "./invitation-sign-up-usecase";

export interface ProviderIdentityLifecycleSecurity { readonly scope: IdentityPlatformAuthorizationScope; }
export interface ProviderIdentityLifecycleResult { readonly userId: string; readonly status: "suspended" | "active"; readonly changedAt: string; readonly revokedSessions: number; }
export interface ProviderIdentityLifecycleUseCase {
    suspend(userId: string, context: RuntimeContext, security: ProviderIdentityLifecycleSecurity): Promise<ProviderIdentityLifecycleResult>;
    reactivate(userId: string, context: RuntimeContext, security: ProviderIdentityLifecycleSecurity): Promise<ProviderIdentityLifecycleResult>;
}

export function createProviderIdentityLifecycleUseCase(input: {
    readonly engine: Pick<FolksdoEngine, "state">;
    readonly clock: Clock;
    readonly ids: Pick<IdentityIdGenerator, "createEventId" | "createOutboxMessageId">;
    readonly readStore: IdentityReadStore & IdentityAdministrationSessionReadStore;
    readonly authorization: IdentityAuthorization;
    readonly betterAuth: BetterAuthIdentityAdapter;
    readonly collections: Pick<IdentityCollections, "users" | "sessions">;
    readonly outboxSubjects: Pick<IdentityOutboxSubjects, "userDisabled" | "userRestored" | "sessionEnded">;
}): ProviderIdentityLifecycleUseCase {
    return {
        async suspend(userId, context, security) {
            await input.authorization.authorize({ permission: identityPermissions.suspend, scope: security.scope, resource: { type: "identity", id: userId } }, context);
            const user = await requireUser(userId);
            if (user.status === "suspended") return { userId, status: "suspended", changedAt: user.suspendedAt ?? user.updatedAt, revokedSessions: 0 };
            if (user.status !== "active") throw new InvalidIdentityLifecycleTransitionError();
            const changedAt = input.clock.nowTimestamp();
            const sessions = (await input.readStore.listSessionsByUserId(userId)).filter(session => session.status === "active");
            for (const session of sessions) await input.betterAuth.signOut({ sessionId: session.sessionId, providerSessionId: session.providerSessionId, userId });
            await commitSuspend(user, sessions, changedAt, context);
            return { userId, status: "suspended", changedAt, revokedSessions: sessions.length };
        },
        async reactivate(userId, context, security) {
            await input.authorization.authorize({ permission: identityPermissions.reactivate, scope: security.scope, resource: { type: "identity", id: userId } }, context);
            const user = await requireUser(userId);
            if (user.status === "active") return { userId, status: "active", changedAt: user.reactivatedAt ?? user.updatedAt, revokedSessions: 0 };
            if (user.status !== "suspended") throw new InvalidIdentityLifecycleTransitionError();
            const changedAt = input.clock.nowTimestamp();
            await commitReactivate(user, changedAt, context);
            return { userId, status: "active", changedAt, revokedSessions: 0 };
        },
    };

    async function requireUser(userId: string): Promise<IdentityUserState> {
        const user = await input.readStore.findUserById(userId);
        if (user === null) throw new IdentityUserNotFoundError(userId);
        return user;
    }
    async function commitSuspend(user: IdentityUserState, sessions: readonly IdentitySessionState[], at: string, context: RuntimeContext) {
        const sessionChanges: StateChange[] = sessions.map(session => ({ operation: "update", collection: input.collections.sessions, key: { sessionId: session.sessionId }, patch: { status: "revoked", endedAt: at, updatedAt: at } } as StateChange));
        const sessionEvents: ReplayableEvent[] = sessions.map(session => evt(input.ids.createEventId(), "identity.session", session.sessionId, "identity.session_ended", at, { sessionId: session.sessionId, userId: user.userId, endedAt: at, reason: "revoked" }, context));
        const sessionOutbox: OutboxMessage[] = sessions.map(session => msg(input.ids.createOutboxMessageId(), input.outboxSubjects.sessionEnded, at, { sessionId: session.sessionId, userId: user.userId, endedAt: at, reason: "revoked" }, context));
        await commit({ context, userId: user.userId, stateChanges: [{ operation: "update", collection: input.collections.users, key: { userId: user.userId }, patch: { status: "suspended", suspendedAt: at, updatedAt: at } } as StateChange, ...sessionChanges], events: [evt(input.ids.createEventId(), "identity.user", user.userId, "identity.user_suspended", at, { identityId: user.userId, reason: "provider_suspended" }, context), ...sessionEvents], outbox: [msg(input.ids.createOutboxMessageId(), input.outboxSubjects.userDisabled, at, { identityId: user.userId, reason: "provider_suspended" }, context), ...sessionOutbox] });
    }
    async function commitReactivate(user: IdentityUserState, at: string, context: RuntimeContext) {
        await commit({ context, userId: user.userId, stateChanges: [{ operation: "update", collection: input.collections.users, key: { userId: user.userId }, patch: { status: "active", reactivatedAt: at, updatedAt: at } } as StateChange], events: [evt(input.ids.createEventId(), "identity.user", user.userId, "identity.user_reactivated", at, { identityId: user.userId }, context)], outbox: [msg(input.ids.createOutboxMessageId(), input.outboxSubjects.userRestored, at, { identityId: user.userId }, context)] });
    }
    async function commit(x: { context: RuntimeContext; userId: string; stateChanges: readonly StateChange[]; events: readonly ReplayableEvent[]; outbox: readonly OutboxMessage[] }) {
        try { await input.engine.state.commit({ context: x.context, aggregate: { aggregateType: "identity.user", aggregateId: x.userId }, stateChanges: x.stateChanges, events: x.events, outbox: x.outbox }); }
        catch (error) { console.error("Identity Provider Lifecycle Engine commit failed.", error); throw new IdentityCommitFailedError(); }
    }
}
function meta(c: RuntimeContext): Readonly<Record<string, unknown>> { return { requestId: c.requestId, correlationId: c.correlationId, causationId: c.causationId, actorId: c.actor.actorId, actorType: c.actor.actorType, tenantId: c.tenant.tenantId, tenantType: c.tenant.tenantType }; }
function evt(eventId: string, aggregateType: string, aggregateId: string, eventType: string, occurredAt: string, payload: Record<string, unknown>, c: RuntimeContext): ReplayableEvent { return { eventId, aggregateType, aggregateId, eventType, version: 1, occurredAt, payload, metadata: meta(c) } as ReplayableEvent; }
function msg(messageId: string, subject: string, occurredAt: string, payload: Record<string, unknown>, c: RuntimeContext): OutboxMessage { return { messageId, subject, occurredAt, payload, metadata: meta(c) } as OutboxMessage; }
