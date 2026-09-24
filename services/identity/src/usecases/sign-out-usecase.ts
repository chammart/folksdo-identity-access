// services/identity/src/usecases/sign-out-usecase.ts
// -----------------------------------------------------------------------------
// SIGN OUT USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Sign Out™.
//
// Purpose:
//   • validate an active Identity-owned session reference
//   • delegate provider session revocation to BetterAuth
//   • mark the session lifecycle as signed out
//   • emit replayable session-ended business event
//   • persist matching outbox message for asynchronous reactions
//   • commit through Folksdo Engine™ atomically
// -----------------------------------------------------------------------------

import type { Clock } from "@folksdo-engine/foundation";
import type {
    FolksdoEngine,
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type { SignOutRequest, SignOutResult } from "../api";
import type { BetterAuthIdentityAdapter } from "../adapters";
import { endSession } from "../business-rules";
import {
    IdentityCommitFailedError,
    SessionNotFoundError,
} from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentitySessionState } from "../state";
import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

export interface SignOutUseCase {
    execute(
        input: SignOutRequest,
        context: RuntimeContext,
    ): Promise<SignOutResult>;
}

export interface SignOutUseCaseDependencies {
    readonly engine: Pick<FolksdoEngine, "state">;
    readonly clock: Clock;
    readonly ids: Pick<
        IdentityIdGenerator,
        "createEventId" | "createOutboxMessageId"
    >;
    readonly readStore: IdentityReadStore;
    readonly betterAuth: BetterAuthIdentityAdapter;
    readonly collections: Pick<IdentityCollections, "sessions">;
    readonly outboxSubjects: Pick<IdentityOutboxSubjects, "sessionEnded">;
}

export function createSignOutUseCase(
    dependencies: SignOutUseCaseDependencies,
): SignOutUseCase {
    return {
        async execute(
            input: SignOutRequest,
            context: RuntimeContext,
        ): Promise<SignOutResult> {
            const session = await dependencies.readStore.findSessionById(
                input.sessionId,
            );

            if (!session) {
                throw new SessionNotFoundError();
            }

            const endedAt = dependencies.clock.nowTimestamp();
            const endedSession = endSession({
                session,
                endedAt,
            });

            await dependencies.betterAuth.signOut({
                sessionId: session.sessionId,
                providerSessionId: session.providerSessionId,
                userId: session.userId,
            });

            const payload = sessionEndedPayload({
                session: endedSession,
                endedAt,
            });

            try {
                await dependencies.engine.state.commit({
                    context,
                    aggregate: {
                        aggregateType: "identity.session",
                        aggregateId: endedSession.sessionId,
                    },
                    stateChanges: [
                        updateSession({
                            collection: dependencies.collections.sessions,
                            session: endedSession,
                        }),
                    ],
                    events: [
                        event({
                            dependencies,
                            context,
                            aggregateType: "identity.session",
                            aggregateId: endedSession.sessionId,
                            eventType: "identity.session_ended",
                            occurredAt: endedAt,
                            payload,
                        }),
                    ],
                    outbox: [
                        outbox({
                            dependencies,
                            context,
                            subject: dependencies.outboxSubjects.sessionEnded,
                            occurredAt: endedAt,
                            payload,
                        }),
                    ],
                });
            } catch (error) {
                console.error("Identity Sign Out Engine commit failed.", error);

                throw new IdentityCommitFailedError();
            }

            return {
                userId: endedSession.userId,
                sessionId: endedSession.sessionId,
                status: "signed_out",
                endedAt,
            };
        },
    };
}

function sessionEndedPayload(input: {
    readonly session: IdentitySessionState;
    readonly endedAt: string;
}): Record<string, unknown> {
    return {
        sessionId: input.session.sessionId,
        userId: input.session.userId,
        endedAt: input.endedAt,
        reason: "signed_out",
    };
}

function updateSession(input: {
    readonly collection: string;
    readonly session: IdentitySessionState;
}): StateChange {
    return {
        operation: "update",
        collection: input.collection,
        key: {
            sessionId: input.session.sessionId,
        },
        patch: {
            status: input.session.status,
            endedAt: input.session.endedAt,
            updatedAt: input.session.updatedAt,
        },
    } as StateChange;
}

function event(input: {
    readonly dependencies: SignOutUseCaseDependencies;
    readonly context: RuntimeContext;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly eventType: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}): ReplayableEvent {
    return {
        eventId: input.dependencies.ids.createEventId(),
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        version: 1,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: metadata(input.context),
    } as ReplayableEvent;
}

function outbox(input: {
    readonly dependencies: SignOutUseCaseDependencies;
    readonly context: RuntimeContext;
    readonly subject: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}): OutboxMessage {
    return {
        messageId: input.dependencies.ids.createOutboxMessageId(),
        subject: input.subject,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: metadata(input.context),
    } as OutboxMessage;
}

function metadata(context: RuntimeContext): Readonly<Record<string, unknown>> {
    return {
        requestId: context.requestId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        tenantId: context.tenant.tenantId,
        tenantType: context.tenant.tenantType,
    };
}
