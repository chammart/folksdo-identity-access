// services/identity/src/usecases/request-password-reset-usecase.ts
// -----------------------------------------------------------------------------
// REQUEST PASSWORD RESET USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Request Password Reset™.
//
// Purpose:
//   • accept a credential recovery request without account enumeration
//   • resolve eligible Identity-owned user state where safe
//   • delegate reset-token mechanics to BetterAuth
//   • persist durable password-reset-request lifecycle state
//   • emit a replayable password-reset-requested business event
//   • persist matching outbox message for asynchronous reactions
//   • commit state, event, and outbox atomically through Folksdo Engine™
//
// Unknown users intentionally receive the same safe response but do not trigger
// provider reset-token mechanics, Identity state changes, or business events.
//
// Architectural rule:
//   Folksdo Engine™ requires every mutation commit to include at least one
//   canonical state change. Password-reset requests are therefore represented
//   by durable Identity-owned lifecycle state rather than event-only commits.
// -----------------------------------------------------------------------------

import type { Clock } from "@folksdo-engine/foundation";
import type {
    FolksdoEngine,
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    RequestPasswordResetRequest,
    RequestPasswordResetResult,
} from "../api";
import type { BetterAuthIdentityAdapter } from "../adapters";
import { normalizeEmail } from "../business-rules";
import { IdentityCommitFailedError } from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentityUserState } from "../state";
import type {
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const DEFAULT_PASSWORD_RESET_REQUESTS_COLLECTION =
    "identity_password_reset_requests";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACTS
// -----------------------------------------------------------------------------

export interface RequestPasswordResetUseCase {
    execute(
        input: RequestPasswordResetRequest,
        context: RuntimeContext,
    ): Promise<RequestPasswordResetResult>;
}

export interface RequestPasswordResetUseCaseDependencies {
    readonly engine: Pick<FolksdoEngine, "state">;

    readonly clock: Clock;

    readonly ids: Pick<
        IdentityIdGenerator,
        "createEventId" | "createOutboxMessageId"
    >;

    readonly readStore: IdentityReadStore;

    readonly betterAuth: BetterAuthIdentityAdapter;

    readonly outboxSubjects: Pick<
        IdentityOutboxSubjects,
        "passwordResetRequested"
    >;

    /**
     * Identity-owned canonical collection for credential-recovery requests.
     *
     * Optional for backward-compatible bootstrap integration. The default
     * collection name remains deterministic across environments.
     */
    readonly passwordResetRequestsCollection?: string;
}

// -----------------------------------------------------------------------------
// PASSWORD RESET REQUEST STATE
// -----------------------------------------------------------------------------

export type IdentityPasswordResetRequestStatus = "requested";

export interface IdentityPasswordResetRequestState {
    readonly passwordResetRequestId: string;
    readonly userId: string;
    readonly email: string;
    readonly status: IdentityPasswordResetRequestStatus;
    readonly requestedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;

    readonly requestId: string;
    readonly correlationId: string;
    readonly causationId?: string;

    readonly actorId: string;
    readonly actorType: string;

    readonly tenantId: string;
    readonly tenantType: string;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createRequestPasswordResetUseCase(
    dependencies: RequestPasswordResetUseCaseDependencies,
): RequestPasswordResetUseCase {
    return {
        async execute(
            input: RequestPasswordResetRequest,
            context: RuntimeContext,
        ): Promise<RequestPasswordResetResult> {
            const email = normalizeEmail(input.email);
            const requestedAt = dependencies.clock.nowTimestamp();

            const user = await dependencies.readStore.findUserByEmail(email);

            // Preserve account-enumeration protection.
            //
            // Unknown or ineligible users receive the same externally visible
            // response without triggering provider mechanics or durable state.
            if (!user || !isUserEligibleForPasswordReset(user)) {
                return safeResponse();
            }

            // BetterAuth owns reset-token generation and credential-provider
            // mechanics. Identity records the resulting business lifecycle.
            await dependencies.betterAuth.requestPasswordReset({
                email,
            });

            const passwordResetRequest =
                createPasswordResetRequestState({
                    dependencies,
                    context,
                    user,
                    requestedAt,
                });

            const payload = passwordResetRequestedPayload({
                request: passwordResetRequest,
            });

            const collection =
                dependencies.passwordResetRequestsCollection ??
                DEFAULT_PASSWORD_RESET_REQUESTS_COLLECTION;

            try {
                await dependencies.engine.state.commit({
                    context,

                    aggregate: {
                        aggregateType: "identity.user",
                        aggregateId: user.userId,
                    },

                    stateChanges: [
                        insert(
                            collection,
                            passwordResetRequest,
                        ),
                    ],

                    events: [
                        event({
                            dependencies,
                            context,
                            aggregateType: "identity.user",
                            aggregateId: user.userId,
                            eventType: "identity.password_reset_requested",
                            occurredAt: requestedAt,
                            payload,
                        }),
                    ],

                    outbox: [
                        outbox({
                            dependencies,
                            context,

                            subject:
                                dependencies.outboxSubjects
                                    .passwordResetRequested,

                            occurredAt:
                                requestedAt,

                            payload,
                        }),
                    ],
                });
            } catch (error) {
                console.error(
                    "Identity Request Password Reset Engine commit failed.",
                    error,
                );

                throw new IdentityCommitFailedError();
            }

            return safeResponse();
        },
    };
}

// -----------------------------------------------------------------------------
// BUSINESS RULES
// -----------------------------------------------------------------------------

function isUserEligibleForPasswordReset(
    user: IdentityUserState,
): boolean {
    return (
        user.status === "active" &&
        user.emailVerified
    );
}

function safeResponse(): RequestPasswordResetResult {
    return {
        passwordResetRequested: true,
    };
}

// -----------------------------------------------------------------------------
// STATE CREATION
// -----------------------------------------------------------------------------

function createPasswordResetRequestState(input: {
    readonly dependencies:
    RequestPasswordResetUseCaseDependencies;

    readonly context:
    RuntimeContext;

    readonly user:
    IdentityUserState;

    readonly requestedAt:
    string;
}): IdentityPasswordResetRequestState {
    return {
        // The existing Identity ID contract does not yet expose a dedicated
        // password-reset-request ID generator. createEventId() provides a
        // unique opaque identifier without introducing random infrastructure
        // inside the use case. A dedicated factory method may replace this
        // later without changing persisted semantics.
        passwordResetRequestId:
            input.dependencies.ids.createEventId(),

        userId:
            input.user.userId,

        email:
            input.user.email,

        status:
            "requested",

        requestedAt:
            input.requestedAt,

        createdAt:
            input.requestedAt,

        updatedAt:
            input.requestedAt,

        requestId:
            input.context.requestId,

        correlationId:
            input.context.correlationId,

        causationId:
            input.context.causationId,

        actorId:
            input.context.actor.actorId,

        actorType:
            input.context.actor.actorType,

        tenantId:
            input.context.tenant.tenantId,

        tenantType:
            input.context.tenant.tenantType,
    };
}

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

function passwordResetRequestedPayload(input: {
    readonly request:
    IdentityPasswordResetRequestState;
}): Record<string, unknown> {
    return {
        passwordResetRequestId:
            input.request.passwordResetRequestId,

        userId:
            input.request.userId,

        email:
            input.request.email,

        status:
            input.request.status,

        requestedAt:
            input.request.requestedAt,
    };
}

// -----------------------------------------------------------------------------
// STATE CHANGE
// -----------------------------------------------------------------------------

function insert<T extends object>(
    collection: string,
    document: T,
): StateChange {
    return {
        operation:
            "insert",

        collection,

        document:
            document as unknown as Readonly<
                Record<string, unknown>
            >,
    } as StateChange;
}

// -----------------------------------------------------------------------------
// EVENT
// -----------------------------------------------------------------------------

function event(input: {
    readonly dependencies:
    RequestPasswordResetUseCaseDependencies;

    readonly context:
    RuntimeContext;

    readonly aggregateType:
    string;

    readonly aggregateId:
    string;

    readonly eventType:
    string;

    readonly occurredAt:
    string;

    readonly payload:
    Record<string, unknown>;
}): ReplayableEvent {
    return {
        eventId:
            input.dependencies.ids.createEventId(),

        aggregateType:
            input.aggregateType,

        aggregateId:
            input.aggregateId,

        eventType:
            input.eventType,

        version:
            1,

        occurredAt:
            input.occurredAt,

        payload:
            input.payload,

        metadata:
            metadata(input.context),
    } as ReplayableEvent;
}

// -----------------------------------------------------------------------------
// OUTBOX
// -----------------------------------------------------------------------------

function outbox(input: {
    readonly dependencies:
    RequestPasswordResetUseCaseDependencies;

    readonly context:
    RuntimeContext;

    readonly subject:
    string;

    readonly occurredAt:
    string;

    readonly payload:
    Record<string, unknown>;
}): OutboxMessage {
    return {
        messageId:
            input.dependencies.ids
                .createOutboxMessageId(),

        subject:
            input.subject,

        occurredAt:
            input.occurredAt,

        payload:
            input.payload,

        metadata:
            metadata(input.context),
    } as OutboxMessage;
}

// -----------------------------------------------------------------------------
// METADATA
// -----------------------------------------------------------------------------

function metadata(
    context: RuntimeContext,
): Readonly<Record<string, unknown>> {
    return {
        requestId:
            context.requestId,

        correlationId:
            context.correlationId,

        causationId:
            context.causationId,

        actorId:
            context.actor.actorId,

        actorType:
            context.actor.actorType,

        tenantId:
            context.tenant.tenantId,

        tenantType:
            context.tenant.tenantType,
    };
}