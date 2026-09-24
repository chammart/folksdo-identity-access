// services/identity/src/usecases/reset-password-usecase.ts
// -----------------------------------------------------------------------------
// RESET PASSWORD USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Reset Password™.
//
// Purpose:
//   • validate reset token and password policy input
//   • delegate reset-token validation and password update mechanics to BetterAuth
//   • resolve the canonical Identity credential from the provider identity
//   • revoke every active Identity session after successful password recovery
//   • update Identity-owned credential and session lifecycle state
//   • record replayable credential and session lifecycle events
//   • persist matching outbox messages
//   • commit state, events, and outbox through Folksdo Engine™
//
// Security policy:
//
//   • password reset is an account-recovery operation
//   • no existing authenticated session is trusted or preserved
//   • every active Identity session is revoked after provider password mutation
//   • the user must authenticate again with the replacement password
//
// Ownership:
//
//   • BetterAuth owns reset-token validation and password mutation
//   • Identity owns credential references and session lifecycle state
//
// Identity never persists or returns passwords, password hashes, reset tokens,
// provider tokens, provider session identifiers, credential secrets, or raw
// BetterAuth payloads.
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    ResetPasswordRequest,
    ResetPasswordResult,
} from "../api";

import type {
    BetterAuthIdentityAdapter,
} from "../adapters";

import {
    endSession,
} from "../business-rules";

import {
    IdentityCommitFailedError,
    InvalidPasswordResetTokenError,
    WeakPasswordError,
} from "../errors";

import type {
    IdentityCredentialReadStore,
} from "../read-store";

import type {
    IdentityCredentialState,
    IdentitySessionState,
} from "../state";

import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

// -----------------------------------------------------------------------------
// USE CASE CONTRACT
// -----------------------------------------------------------------------------

export interface ResetPasswordUseCase {
    execute(
        input:
            ResetPasswordRequest,

        context:
            RuntimeContext,
    ): Promise<ResetPasswordResult>;
}

// -----------------------------------------------------------------------------
// SESSION READ CONTRACT
// -----------------------------------------------------------------------------
// Narrow application-layer dependency required by Reset Password™.
//
// The concrete Identity read store will implement this contract. Keeping the
// contract narrow prevents the use case from depending on unrelated queries.
// -----------------------------------------------------------------------------

export interface ResetPasswordSessionReadStore {
    listActiveSessionsByUserId(
        userId:
            string,
    ): Promise<readonly IdentitySessionState[]>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface ResetPasswordUseCaseDependencies {
    readonly engine:
    Pick<
        FolksdoEngine,
        "state"
    >;

    readonly clock:
    Clock;

    readonly ids:
    Pick<
        IdentityIdGenerator,
        "createEventId"
        | "createOutboxMessageId"
    >;

    readonly betterAuth:
    BetterAuthIdentityAdapter;

    readonly credentialReadStore:
    IdentityCredentialReadStore;

    readonly sessionReadStore:
    ResetPasswordSessionReadStore;

    readonly collections:
    Pick<
        IdentityCollections,
        "credentials"
        | "sessions"
    >;

    readonly outboxSubjects:
    Pick<
        IdentityOutboxSubjects,
        "credentialUpdated"
        | "sessionEnded"
    >;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createResetPasswordUseCase(
    dependencies:
        ResetPasswordUseCaseDependencies,
): ResetPasswordUseCase {
    return {
        async execute(
            input:
                ResetPasswordRequest,

            context:
                RuntimeContext,
        ): Promise<ResetPasswordResult> {
            const token =
                normalizeToken(
                    input.token,
                );

            const newPassword =
                normalizePassword(
                    input.newPassword,
                );

            assertPasswordPolicy(
                newPassword,
            );

            // BetterAuth is authoritative for reset-token validation and the
            // password mutation itself.
            //
            // No Identity-owned state is changed before provider success.
            const reset =
                await dependencies
                    .betterAuth
                    .resetPassword({
                        token,

                        newPassword,
                    });

            const providerCredentialId =
                createProviderCredentialId(
                    reset.userId,
                );

            const credential =
                await dependencies
                    .credentialReadStore
                    .findCredentialByProviderCredentialId(
                        providerCredentialId,
                    );

            if (
                credential ===
                null
            ) {
                throw new InvalidPasswordResetTokenError();
            }

            const updatedAt =
                normalizeUpdatedAt({
                    value:
                        reset.updatedAt,

                    clock:
                        dependencies.clock,
                });

            const activeSessions =
                await dependencies
                    .sessionReadStore
                    .listActiveSessionsByUserId(
                        credential.userId,
                    );

            const endedSessions =
                activeSessions
                    .filter(
                        (
                            session,
                        ) =>
                            isActiveSessionForUser({
                                session,

                                userId:
                                    credential.userId,
                            }),
                    )
                    .map(
                        (
                            session,
                        ) =>
                            endSession({
                                session,

                                endedAt:
                                    updatedAt,
                            }),
                    );

            const credentialPayload =
                createCredentialUpdatedPayload({
                    userId:
                        credential.userId,

                    updatedAt,

                    sessionsRevoked:
                        endedSessions.length,
                });

            const sessionPayloads =
                endedSessions.map(
                    (
                        session,
                    ) =>
                        createSessionEndedPayload({
                            session,

                            endedAt:
                                updatedAt,
                        }),
                );

            try {
                await dependencies
                    .engine
                    .state
                    .commit({
                        context,

                        aggregate: {
                            aggregateType:
                                "identity.user",

                            aggregateId:
                                credential.userId,
                        },

                        stateChanges: [
                            updateCredential({
                                collection:
                                    dependencies
                                        .collections
                                        .credentials,

                                credential,

                                updatedAt,
                            }),

                            ...endedSessions.map(
                                (
                                    session,
                                ) =>
                                    updateSession({
                                        collection:
                                            dependencies
                                                .collections
                                                .sessions,

                                        session,
                                    }),
                            ),
                        ],

                        events: [
                            createEvent({
                                dependencies,

                                context,

                                aggregateType:
                                    "identity.user",

                                aggregateId:
                                    credential.userId,

                                eventType:
                                    "identity.credential_updated",

                                occurredAt:
                                    updatedAt,

                                payload:
                                    credentialPayload,
                            }),

                            ...endedSessions.map(
                                (
                                    session,
                                    index,
                                ) =>
                                    createEvent({
                                        dependencies,

                                        context,

                                        aggregateType:
                                            "identity.session",

                                        aggregateId:
                                            session.sessionId,

                                        eventType:
                                            "identity.session_ended",

                                        occurredAt:
                                            updatedAt,

                                        payload:
                                            sessionPayloads[index]
                                            ?? createSessionEndedPayload({
                                                session,

                                                endedAt:
                                                    updatedAt,
                                            }),
                                    }),
                            ),
                        ],

                        outbox: [
                            createOutboxMessage({
                                dependencies,

                                context,

                                subject:
                                    dependencies
                                        .outboxSubjects
                                        .credentialUpdated,

                                occurredAt:
                                    updatedAt,

                                payload:
                                    credentialPayload,
                            }),

                            ...sessionPayloads.map(
                                (
                                    payload,
                                ) =>
                                    createOutboxMessage({
                                        dependencies,

                                        context,

                                        subject:
                                            dependencies
                                                .outboxSubjects
                                                .sessionEnded,

                                        occurredAt:
                                            updatedAt,

                                        payload,
                                    }),
                            ),
                        ],
                    });
            } catch (
            error
            ) {
                console.error(
                    "Identity Reset Password Engine commit failed.",
                    error,
                );

                throw new IdentityCommitFailedError();
            }

            return {
                credentialUpdated:
                    true,
            };
        },
    };
}

// -----------------------------------------------------------------------------
// INPUT NORMALIZATION
// -----------------------------------------------------------------------------

function normalizeToken(
    token:
        string,
): string {
    const normalized =
        token.trim();

    if (
        normalized.length ===
        0
    ) {
        throw new InvalidPasswordResetTokenError();
    }

    return normalized;
}

function normalizePassword(
    password:
        string,
): string {
    if (
        password.trim().length ===
        0
    ) {
        throw new WeakPasswordError(
            "New password is required.",
        );
    }

    return password;
}

function normalizeUpdatedAt(
    input: {
        readonly value:
        string;

        readonly clock:
        Clock;
    },
): string {
    const normalized =
        input.value.trim();

    if (
        normalized.length ===
        0
        || Number.isNaN(
            Date.parse(
                normalized,
            ),
        )
    ) {
        return input
            .clock
            .nowTimestamp();
    }

    return normalized;
}

// -----------------------------------------------------------------------------
// PASSWORD POLICY
// -----------------------------------------------------------------------------

function assertPasswordPolicy(
    password:
        string,
): void {
    if (
        password.length <
        12
    ) {
        throw new WeakPasswordError();
    }
}

// -----------------------------------------------------------------------------
// PROVIDER REFERENCE
// -----------------------------------------------------------------------------

function createProviderCredentialId(
    providerUserId:
        string,
): string {
    const normalized =
        providerUserId.trim();

    if (
        normalized.length ===
        0
    ) {
        throw new InvalidPasswordResetTokenError();
    }

    return `better-auth:credential:${normalized}`;
}

// -----------------------------------------------------------------------------
// SESSION POLICY
// -----------------------------------------------------------------------------

function isActiveSessionForUser(
    input: {
        readonly session:
        IdentitySessionState;

        readonly userId:
        string;
    },
): boolean {
    return (
        input.session.userId ===
        input.userId
        && input.session.status ===
        "active"
    );
}

// -----------------------------------------------------------------------------
// STATE CHANGES
// -----------------------------------------------------------------------------

function updateCredential(
    input: {
        readonly collection:
        string;

        readonly credential:
        IdentityCredentialState;

        readonly updatedAt:
        string;
    },
): StateChange {
    return {
        operation:
            "update",

        collection:
            input.collection,

        key: {
            credentialId:
                input.credential.credentialId,
        },

        patch: {
            updatedAt:
                input.updatedAt,
        },
    } as StateChange;
}

function updateSession(
    input: {
        readonly collection:
        string;

        readonly session:
        IdentitySessionState;
    },
): StateChange {
    return {
        operation:
            "update",

        collection:
            input.collection,

        key: {
            sessionId:
                input.session.sessionId,
        },

        patch: {
            status:
                input.session.status,

            endedAt:
                input.session.endedAt,

            updatedAt:
                input.session.updatedAt,
        },
    } as StateChange;
}

// -----------------------------------------------------------------------------
// BUSINESS PAYLOADS
// -----------------------------------------------------------------------------

function createCredentialUpdatedPayload(
    input: {
        readonly userId:
        string;

        readonly updatedAt:
        string;

        readonly sessionsRevoked:
        number;
    },
): Readonly<Record<string, unknown>> {
    return {
        userId:
            input.userId,

        credentialType:
            "password",

        updatedAt:
            input.updatedAt,

        reason:
            "password_reset",

        sessionRevocationPolicy:
            "revoke_all",

        sessionsRevoked:
            input.sessionsRevoked,
    };
}

function createSessionEndedPayload(
    input: {
        readonly session:
        IdentitySessionState;

        readonly endedAt:
        string;
    },
): Readonly<Record<string, unknown>> {
    return {
        sessionId:
            input.session.sessionId,

        userId:
            input.session.userId,

        endedAt:
            input.endedAt,

        reason:
            "password_reset",
    };
}

// -----------------------------------------------------------------------------
// EVENT
// -----------------------------------------------------------------------------

function createEvent(
    input: {
        readonly dependencies:
        ResetPasswordUseCaseDependencies;

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
        Readonly<Record<string, unknown>>;
    },
): ReplayableEvent {
    return {
        eventId:
            input.dependencies
                .ids
                .createEventId(),

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
            createMetadata(
                input.context,
            ),
    } as ReplayableEvent;
}

// -----------------------------------------------------------------------------
// OUTBOX
// -----------------------------------------------------------------------------

function createOutboxMessage(
    input: {
        readonly dependencies:
        ResetPasswordUseCaseDependencies;

        readonly context:
        RuntimeContext;

        readonly subject:
        string;

        readonly occurredAt:
        string;

        readonly payload:
        Readonly<Record<string, unknown>>;
    },
): OutboxMessage {
    return {
        messageId:
            input.dependencies
                .ids
                .createOutboxMessageId(),

        subject:
            input.subject,

        occurredAt:
            input.occurredAt,

        payload:
            input.payload,

        metadata:
            createMetadata(
                input.context,
            ),
    } as OutboxMessage;
}

// -----------------------------------------------------------------------------
// METADATA
// -----------------------------------------------------------------------------

function createMetadata(
    context:
        RuntimeContext,
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