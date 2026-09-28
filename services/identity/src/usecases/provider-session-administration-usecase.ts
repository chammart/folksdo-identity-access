// services/identity/src/usecases/provider-session-administration-usecase.ts
// -----------------------------------------------------------------------------
// PROVIDER SESSION ADMINISTRATION
// -----------------------------------------------------------------------------
// Provider-authorized safe session reads and revocation. Provider session
// references, bearer secrets, tokens, and credentials never cross this boundary.
// -----------------------------------------------------------------------------

import type { Clock } from "@folksdo-engine/foundation";
import type { FolksdoEngine, OutboxMessage, ReplayableEvent, RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import type { BetterAuthIdentityAdapter } from "../adapters";
import type { ProviderAllSessionsRevocationResult, ProviderIdentitySessionListResponse, ProviderIdentitySessionResponse, ProviderSessionRevocationResult } from "../api";
import { identityPermissions, type IdentityAuthorization, type IdentityPlatformAuthorizationScope } from "../authorization";
import { IdentityCommitFailedError, IdentityUserNotFoundError, SessionNotFoundError } from "../errors";
import type { IdentityAdministrationSessionReadStore, IdentityReadStore } from "../read-store";
import type { IdentitySessionState } from "../state";
import type { IdentityCollections, IdentityIdGenerator, IdentityOutboxSubjects } from "./invitation-sign-up-usecase";

export interface ProviderIdentitySecurityAdministration { readonly scope: IdentityPlatformAuthorizationScope; }

export interface ProviderSessionAdministrationUseCase {
    list(userId: string, context: RuntimeContext, security: ProviderIdentitySecurityAdministration): Promise<ProviderIdentitySessionListResponse>;
    get(userId: string, sessionId: string, context: RuntimeContext, security: ProviderIdentitySecurityAdministration): Promise<ProviderIdentitySessionResponse>;
    revoke(userId: string, sessionId: string, context: RuntimeContext, security: ProviderIdentitySecurityAdministration): Promise<ProviderSessionRevocationResult>;
    revokeAll(userId: string, context: RuntimeContext, security: ProviderIdentitySecurityAdministration): Promise<ProviderAllSessionsRevocationResult>;
}

export function createProviderSessionAdministrationUseCase(input: {
    readonly engine: Pick<FolksdoEngine, "state">;
    readonly clock: Clock;
    readonly ids: Pick<IdentityIdGenerator, "createEventId" | "createOutboxMessageId">;
    readonly readStore: IdentityReadStore & IdentityAdministrationSessionReadStore;
    readonly authorization: IdentityAuthorization;
    readonly betterAuth: BetterAuthIdentityAdapter;
    readonly collections: Pick<IdentityCollections, "sessions">;
    readonly outboxSubjects: Pick<IdentityOutboxSubjects, "sessionEnded">;
}): ProviderSessionAdministrationUseCase {
    async function assertUser(userId: string) {
        if (await input.readStore.findUserById(userId) === null) throw new IdentityUserNotFoundError(userId);
    }
    async function authorize(permission: typeof identityPermissions.sessionList | typeof identityPermissions.sessionView | typeof identityPermissions.sessionRevoke | typeof identityPermissions.sessionRevokeAll, resourceId: string | undefined, context: RuntimeContext, security: ProviderIdentitySecurityAdministration) {
        await input.authorization.authorize({ permission, scope: security.scope, resource: { type: "session", ...(resourceId ? { id: resourceId } : {}) } }, context);
    }
    return {
        async list(userId, context, security) {
            await authorize(identityPermissions.sessionList, undefined, context, security);
            await assertUser(userId);
            const sessions = await input.readStore.listSessionsByUserId(userId);
            return { items: sessions.map(toSafeSession).sort((a,b) => b.issuedAt.localeCompare(a.issuedAt)) };
        },
        async get(userId, sessionId, context, security) {
            await authorize(identityPermissions.sessionView, sessionId, context, security);
            await assertUser(userId);
            const session = await input.readStore.findSessionById(sessionId);
            if (session === null || session.userId !== userId) throw new SessionNotFoundError();
            return toSafeSession(session);
        },
        async revoke(userId, sessionId, context, security) {
            await authorize(identityPermissions.sessionRevoke, sessionId, context, security);
            await assertUser(userId);
            const session = await input.readStore.findSessionById(sessionId);
            if (session === null || session.userId !== userId) throw new SessionNotFoundError();
            if (session.status !== "active") return { userId, sessionId, status: "revoked", revokedAt: session.endedAt ?? session.updatedAt };
            const revokedAt = input.clock.nowTimestamp();
            await input.betterAuth.signOut({ sessionId: session.sessionId, providerSessionId: session.providerSessionId, userId: session.userId });
            await commitRevocations([session], revokedAt, context);
            return { userId, sessionId, status: "revoked", revokedAt };
        },
        async revokeAll(userId, context, security) {
            await authorize(identityPermissions.sessionRevokeAll, undefined, context, security);
            await assertUser(userId);
            const sessions = (await input.readStore.listSessionsByUserId(userId)).filter(session => session.status === "active");
            const revokedAt = input.clock.nowTimestamp();
            for (const session of sessions) await input.betterAuth.signOut({ sessionId: session.sessionId, providerSessionId: session.providerSessionId, userId: session.userId });
            if (sessions.length > 0) await commitRevocations(sessions, revokedAt, context);
            return { userId, revokedSessions: sessions.length, revokedAt };
        },
    };

    async function commitRevocations(sessions: readonly IdentitySessionState[], revokedAt: string, context: RuntimeContext): Promise<void> {
        const stateChanges: StateChange[] = sessions.map(session => ({ operation: "update", collection: input.collections.sessions, key: { sessionId: session.sessionId }, patch: { status: "revoked", endedAt: revokedAt, updatedAt: revokedAt } } as StateChange));
        const events: ReplayableEvent[] = sessions.map(session => ({ eventId: input.ids.createEventId(), aggregateType: "identity.session", aggregateId: session.sessionId, eventType: "identity.session_ended", version: 1, occurredAt: revokedAt, payload: { sessionId: session.sessionId, userId: session.userId, endedAt: revokedAt, reason: "revoked" }, metadata: metadata(context) } as ReplayableEvent));
        const outbox: OutboxMessage[] = sessions.map(session => ({ messageId: input.ids.createOutboxMessageId(), subject: input.outboxSubjects.sessionEnded, occurredAt: revokedAt, payload: { sessionId: session.sessionId, userId: session.userId, endedAt: revokedAt, reason: "revoked" }, metadata: metadata(context) } as OutboxMessage));
        try { await input.engine.state.commit({ context, aggregate: { aggregateType: "identity.user", aggregateId: sessions[0]!.userId }, stateChanges, events, outbox }); }
        catch (error) { console.error("Identity Provider Session Revocation Engine commit failed.", error); throw new IdentityCommitFailedError(); }
    }
}

function toSafeSession(session: IdentitySessionState): ProviderIdentitySessionResponse {
    return { sessionId: session.sessionId, userId: session.userId, status: session.status, issuedAt: session.issuedAt, expiresAt: session.expiresAt, createdAt: session.createdAt, updatedAt: session.updatedAt, ...(session.endedAt ? { endedAt: session.endedAt } : {}) };
}
function metadata(context: RuntimeContext): Readonly<Record<string, unknown>> { return { requestId: context.requestId, correlationId: context.correlationId, causationId: context.causationId, actorId: context.actor.actorId, actorType: context.actor.actorType, tenantId: context.tenant.tenantId, tenantType: context.tenant.tenantType }; }
