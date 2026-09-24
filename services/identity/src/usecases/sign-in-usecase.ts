// services/identity/src/usecases/sign-in-usecase.ts
// -----------------------------------------------------------------------------
// SIGN IN USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Sign In™.
//
// Purpose:
//   • authenticate a known user through BetterAuth
//   • enforce Identity-owned eligibility rules
//   • create durable active session lifecycle state
//   • emit replayable session business event
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

import type { SignInRequest, SignInResult } from "../api";
import type { BetterAuthIdentityAdapter } from "../adapters";
import { createSession, normalizeEmail } from "../business-rules";
import {
    IdentityCommitFailedError,
    IdentityNotEligibleForSignInError,
    InvalidAuthenticationCredentialsError,
} from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentitySessionState, IdentityUserState } from "../state";
import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

export interface SignInUseCase {
    execute(input: SignInRequest, context: RuntimeContext): Promise<SignInResult>;
}

export interface SignInUseCaseDependencies {
    readonly engine: Pick<FolksdoEngine, "state">;
    readonly clock: Clock;
    readonly ids: Pick<
        IdentityIdGenerator,
        "createSessionId" | "createEventId" | "createOutboxMessageId"
    >;
    readonly readStore: IdentityReadStore;
    readonly betterAuth: BetterAuthIdentityAdapter;
    readonly collections: Pick<IdentityCollections, "sessions">;
    readonly outboxSubjects: Pick<IdentityOutboxSubjects, "sessionCreated">;
    readonly sessionTtlMilliseconds: number;
}

export function createSignInUseCase(
    dependencies: SignInUseCaseDependencies,
): SignInUseCase {
    return {
        async execute(
            input: SignInRequest,
            context: RuntimeContext,
        ): Promise<SignInResult> {
            const email = normalizeEmail(input.email);
            const sessionId = dependencies.ids.createSessionId();
            const now = dependencies.clock.now();
            const nowTimestamp = dependencies.clock.nowTimestamp();
            const expiresAt = addMilliseconds(
                now,
                dependencies.sessionTtlMilliseconds,
            );

            const auth = await dependencies.betterAuth.signIn({
                email,
                password: input.password,
                sessionId,
            });

            const user = await dependencies.readStore.findUserByEmail(email);

            if (!user) {
                throw new InvalidAuthenticationCredentialsError();
            }

            assertUserCanSignIn(user);

            const session = createSession({
                sessionId,
                userId: user.userId,
                provider: auth.provider,
                providerSessionId: auth.providerSessionId,
                issuedAt: nowTimestamp,
                expiresAt,
                now: nowTimestamp,
            });

            const payload = sessionCreatedPayload({
                user,
                session,
                createdAt: nowTimestamp,
            });

            try {
                await dependencies.engine.state.commit({
                    context,
                    aggregate: {
                        aggregateType: "identity.session",
                        aggregateId: session.sessionId,
                    },
                    stateChanges: [
                        insert(dependencies.collections.sessions, session),
                    ],
                    events: [
                        event({
                            dependencies,
                            context,
                            aggregateType: "identity.session",
                            aggregateId: session.sessionId,
                            eventType: "identity.session_created",
                            occurredAt: nowTimestamp,
                            payload,
                        }),
                    ],
                    outbox: [
                        outbox({
                            dependencies,
                            context,
                            subject: dependencies.outboxSubjects.sessionCreated,
                            occurredAt: nowTimestamp,
                            payload,
                        }),
                    ],
                });
            } catch (error) {
                console.error("Identity Sign In Engine commit failed.", error);

                throw new IdentityCommitFailedError();
            }

            return {
                userId: user.userId,
                email: user.email,
                sessionId: session.sessionId,
                expiresAt: session.expiresAt,
            };
        },
    };
}

function assertUserCanSignIn(user: IdentityUserState): void {
    if (user.status !== "active" || !user.emailVerified) {
        throw new IdentityNotEligibleForSignInError();
    }
}

function sessionCreatedPayload(input: {
    readonly user: IdentityUserState;
    readonly session: IdentitySessionState;
    readonly createdAt: string;
}): Record<string, unknown> {
    return {
        sessionId: input.session.sessionId,
        userId: input.user.userId,
        email: input.user.email,
        createdAt: input.createdAt,
        expiresAt: input.session.expiresAt,
    };
}

function insert<T extends object>(collection: string, document: T): StateChange {
    return {
        operation: "insert",
        collection,
        document: document as unknown as Readonly<Record<string, unknown>>,
    } as StateChange;
}

function event(input: {
    readonly dependencies: SignInUseCaseDependencies;
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
    readonly dependencies: SignInUseCaseDependencies;
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

function addMilliseconds(date: Date, milliseconds: number): string {
    return new Date(date.getTime() + milliseconds).toISOString();
}
