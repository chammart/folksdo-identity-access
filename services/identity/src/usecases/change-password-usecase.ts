// services/identity/src/usecases/change-password-usecase.ts
// -----------------------------------------------------------------------------
// CHANGE PASSWORD USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Change Password™.
//
// Purpose:
//   • validate authenticated caller and password policy input
//   • resolve the authenticated canonical Identity
//   • resolve the canonical Identity credential
//   • delegate current-password verification and password mutation to BetterAuth
//   • update Identity-owned credential lifecycle state
//   • record a business-safe credential lifecycle event
//   • persist the matching outbox message
//   • commit state, event, and outbox through Folksdo Engine™
//
// Ownership:
//   • BetterAuth owns current-password verification and password mutation
//   • Identity owns credential references and credential lifecycle metadata
//   • the authenticated Identity is derived from RuntimeContext
//
// Identity never persists or returns passwords, password hashes, provider
// credentials, provider sessions, credential secrets, or BetterAuth payloads.
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
    ChangePasswordRequest,
    ChangePasswordResult,
} from "../api";

import type {
    BetterAuthIdentityAdapter,
} from "../adapters";

import {
    IdentityCommitFailedError,
    InvalidAuthenticationCredentialsError,
    PasswordReuseNotAllowedError,
    WeakPasswordError,
} from "../errors";

import type {
    IdentityCredentialReadStore,
    IdentityReadStore,
} from "../read-store";

import type {
    IdentityCredentialState,
    IdentityUserState,
} from "../state";

import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

// -----------------------------------------------------------------------------
// USE CASE CONTRACT
// -----------------------------------------------------------------------------

export interface ChangePasswordUseCase {
    execute(
        input:
            ChangePasswordRequest,

        context:
            RuntimeContext,
    ): Promise<ChangePasswordResult>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface ChangePasswordUseCaseDependencies {
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

    readonly readStore:
    IdentityReadStore;

    readonly credentialReadStore:
    IdentityCredentialReadStore;

    readonly betterAuth:
    BetterAuthIdentityAdapter;

    readonly collections:
    Pick<
        IdentityCollections,
        "credentials"
    >;

    readonly outboxSubjects:
    Pick<
        IdentityOutboxSubjects,
        "credentialUpdated"
    >;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createChangePasswordUseCase(
    dependencies:
        ChangePasswordUseCaseDependencies,
): ChangePasswordUseCase {
    return {
        async execute(
            input:
                ChangePasswordRequest,

            context:
                RuntimeContext,
        ): Promise<ChangePasswordResult> {
            const authenticatedUserId =
                normalizeAuthenticatedUserId(
                    context.actor.actorId,
                );

            const currentPassword =
                normalizeCurrentPassword(
                    input.currentPassword,
                );

            const newPassword =
                normalizeNewPassword(
                    input.newPassword,
                );

            assertPasswordPolicy(
                newPassword,
            );

            assertPasswordChanged({
                currentPassword,

                newPassword,
            });

            const user =
                await resolveAuthenticatedUser({
                    dependencies,

                    userId:
                        authenticatedUserId,
                });

            const credential =
                await resolvePasswordCredential({
                    dependencies,

                    user,
                });

            const changed =
                await dependencies
                    .betterAuth
                    .changePassword({
                        userId:
                            user.userId,

                        email:
                            normalizeEmail(
                                user.email,
                            ),

                        currentPassword,

                        newPassword,

                        revokeOtherSessions:
                            input.revokeOtherSessions
                            ?? true,
                    });

            if (
                changed.userId !==
                user.userId
            ) {
                throw new InvalidAuthenticationCredentialsError();
            }

            const updatedAt =
                normalizeUpdatedAt({
                    value:
                        changed.updatedAt,

                    clock:
                        dependencies.clock,
                });

            const payload =
                createCredentialUpdatedPayload({
                    userId:
                        user.userId,

                    updatedAt,

                    otherSessionsRevoked:
                        changed.otherSessionsRevoked,
                });

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
                                user.userId,
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
                        ],

                        events: [
                            createEvent({
                                dependencies,

                                context,

                                aggregateType:
                                    "identity.user",

                                aggregateId:
                                    user.userId,

                                eventType:
                                    "identity.credential_updated",

                                occurredAt:
                                    updatedAt,

                                payload,
                            }),
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

                                payload,
                            }),
                        ],
                    });
            } catch (
            error
            ) {
                console.error(
                    "Identity Change Password Engine commit failed.",
                    error,
                );

                throw new IdentityCommitFailedError();
            }

            return {
                credentialUpdated:
                    true,

                otherSessionsRevoked:
                    changed.otherSessionsRevoked,
            };
        },
    };
}

// -----------------------------------------------------------------------------
// AUTHENTICATED IDENTITY
// -----------------------------------------------------------------------------

function normalizeAuthenticatedUserId(
    actorId:
        string,
): string {
    const normalized =
        actorId.trim();

    if (
        normalized.length ===
        0
        || normalized ===
        "anonymous"
    ) {
        throw new InvalidAuthenticationCredentialsError();
    }

    return normalized;
}

async function resolveAuthenticatedUser(
    input: {
        readonly dependencies:
        ChangePasswordUseCaseDependencies;

        readonly userId:
        string;
    },
): Promise<IdentityUserState> {
    const user =
        await input
            .dependencies
            .readStore
            .findUserById(
                input.userId,
            );

    if (
        user ===
        null
        || user.userId !==
        input.userId
        || user.status !==
        "active"
        || user.emailVerified !==
        true
    ) {
        throw new InvalidAuthenticationCredentialsError();
    }

    return user;
}

// -----------------------------------------------------------------------------
// PASSWORD INPUT
// -----------------------------------------------------------------------------

function normalizeCurrentPassword(
    password:
        string,
): string {
    if (
        password.trim().length ===
        0
    ) {
        throw new InvalidAuthenticationCredentialsError();
    }

    return password;
}

function normalizeNewPassword(
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

function normalizeEmail(
    email:
        string,
): string {
    const normalized =
        email
            .trim()
            .toLowerCase();

    if (
        normalized.length ===
        0
    ) {
        throw new InvalidAuthenticationCredentialsError();
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

function assertPasswordChanged(
    input: {
        readonly currentPassword:
        string;

        readonly newPassword:
        string;
    },
): void {
    if (
        input.currentPassword ===
        input.newPassword
    ) {
        throw new PasswordReuseNotAllowedError();
    }
}

// -----------------------------------------------------------------------------
// CREDENTIAL RESOLUTION
// -----------------------------------------------------------------------------
// The credential is resolved through the canonical Identity user ID.
//
// Provider-owned credential identifiers are stored references. They must never
// be reconstructed from canonical Identity identifiers.
// -----------------------------------------------------------------------------

async function resolvePasswordCredential(
    input: {
        readonly dependencies:
        ChangePasswordUseCaseDependencies;

        readonly user:
        IdentityUserState;
    },
): Promise<IdentityCredentialState> {
    const credential =
        await input
            .dependencies
            .credentialReadStore
            .findActivePasswordCredentialByUserId(
                input.user.userId,
            );

    if (
        credential ===
        null
        || credential.userId !==
        input.user.userId
        || credential.type !==
        "password"
        || credential.status !==
        "active"
    ) {
        throw new InvalidAuthenticationCredentialsError();
    }

    return credential;
}

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------

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
// STATE CHANGE
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

// -----------------------------------------------------------------------------
// BUSINESS PAYLOAD
// -----------------------------------------------------------------------------

function createCredentialUpdatedPayload(
    input: {
        readonly userId:
        string;

        readonly updatedAt:
        string;

        readonly otherSessionsRevoked:
        boolean;
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
            "password_change",

        otherSessionsRevoked:
            input.otherSessionsRevoked,
    };
}

// -----------------------------------------------------------------------------
// EVENT
// -----------------------------------------------------------------------------

function createEvent(
    input: {
        readonly dependencies:
        ChangePasswordUseCaseDependencies;

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
        ChangePasswordUseCaseDependencies;

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