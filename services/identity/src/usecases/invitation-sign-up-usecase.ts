// services/identity/src/usecases/invitation-sign-up-usecase.ts
// -----------------------------------------------------------------------------
// INVITATION SIGNUP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Invitation SignUp™.
//
// Purpose:
//   • validate invitation context
//   • create or reuse global Identity user
//   • call BetterAuth adapter for auth mechanics
//   • prepare state, events, and outbox messages
//   • commit through Folksdo Engine™
//
// Boundary:
//   • owns Identity business orchestration only
//   • does not know about acceptance certification
//   • does not know about Bruno or local fixture mechanics
//   • exposes business facts through canonical events and outbox messages
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
    InvitationSignUpRequest,
    InvitationSignUpResult,
} from "../api";

import type {
    BetterAuthIdentityAdapter,
} from "../adapters";

import {
    createCredential,
    createEmailVerification,
    createSession,
    createUser,
    createUserProfile,
    normalizeEmail,
} from "../business-rules";

import {
    IdentityCommitFailedError,
    InvitationEmailMismatchError,
} from "../errors";

import type {
    IdentityReadStore,
} from "../read-store";

import type {
    IdentityCredentialState,
    IdentityEmailVerificationState,
    IdentitySessionState,
    IdentityUserProfileState,
    IdentityUserState,
} from "../state";

// -----------------------------------------------------------------------------
// USE CASE CONTRACT
// -----------------------------------------------------------------------------

export interface InvitationSignUpUseCase {
    execute(
        input:
            InvitationSignUpRequest,

        context:
            RuntimeContext,
    ): Promise<InvitationSignUpResult>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface InvitationSignUpUseCaseDependencies {
    readonly engine:
    Pick<
        FolksdoEngine,
        "state"
    >;

    readonly clock:
    Clock;

    readonly ids:
    IdentityIdGenerator;

    readonly readStore:
    IdentityReadStore;

    readonly invitationVerifier:
    InvitationVerifier;

    readonly betterAuth:
    BetterAuthIdentityAdapter;

    readonly collections:
    IdentityCollections;

    readonly outboxSubjects:
    IdentityOutboxSubjects;

    readonly sessionTtlMilliseconds:
    number;

    readonly emailVerificationTtlMilliseconds:
    number;
}

export interface IdentityIdGenerator {
    createUserId():
        string;

    createUserProfileId():
        string;

    createCredentialId():
        string;

    createSessionId():
        string;

    createEmailVerificationId():
        string;

    createEventId():
        string;

    createOutboxMessageId():
        string;
}

export interface InvitationVerifier {
    verify(
        token:
            string,
    ): Promise<VerifiedInvitation>;
}

export interface VerifiedInvitation {
    readonly invitationId:
    string;

    readonly targetTenantId:
    string;

    readonly invitedEmail:
    string;
}

export interface IdentityCollections {
    readonly users:
    string;

    readonly userProfiles:
    string;

    readonly credentials:
    string;

    readonly sessions:
    string;

    readonly emailVerifications:
    string;

    readonly knownInvitations:
    string;
}

export interface IdentityOutboxSubjects {
    readonly emailVerificationRequested:
    string;

    readonly invitationRedemptionRequested:
    string;

    readonly userEmailVerified:
    string;

    readonly userActivated:
    string;

    readonly sessionCreated:
    string;

    readonly sessionEnded:
    string;

    readonly passwordResetRequested:
    string;

    readonly credentialUpdated:
    string;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createInvitationSignUpUseCase(
    dependencies:
        InvitationSignUpUseCaseDependencies,
): InvitationSignUpUseCase {
    return {
        async execute(
            input:
                InvitationSignUpRequest,

            context:
                RuntimeContext,
        ): Promise<InvitationSignUpResult> {
            const email =
                normalizeEmail(
                    input.email,
                );

            const invitation =
                await dependencies
                    .invitationVerifier
                    .verify(
                        input.invitationToken,
                    );

            if (
                normalizeEmail(
                    invitation.invitedEmail,
                ) !==
                email
            ) {
                throw new InvitationEmailMismatchError();
            }

            const existingUser =
                await dependencies
                    .readStore
                    .findUserByEmail(
                        email,
                    );

            if (
                existingUser
            ) {
                return await createExistingIdentitySession({
                    dependencies,

                    input,

                    context,

                    invitation,

                    user:
                        existingUser,
                });
            }

            return await createNewIdentity({
                dependencies,

                input,

                context,

                invitation,

                email,
            });
        },
    };
}

// -----------------------------------------------------------------------------
// NEW IDENTITY
// -----------------------------------------------------------------------------

async function createNewIdentity(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly input:
        InvitationSignUpRequest;

        readonly context:
        RuntimeContext;

        readonly invitation:
        VerifiedInvitation;

        readonly email:
        string;
    },
): Promise<InvitationSignUpResult> {
    const now =
        input.dependencies.clock.now();

    const nowTimestamp =
        input.dependencies.clock.nowTimestamp();

    const userId =
        input.dependencies.ids.createUserId();

    const profileId =
        input.dependencies.ids.createUserProfileId();

    const credentialId =
        input.dependencies.ids.createCredentialId();

    const sessionId =
        input.dependencies.ids.createSessionId();

    const verificationId =
        input.dependencies.ids.createEmailVerificationId();

    const issuedAt =
        nowTimestamp;

    const sessionExpiresAt =
        addMilliseconds(
            now,
            input.dependencies.sessionTtlMilliseconds,
        );

    const verificationExpiresAt =
        addMilliseconds(
            now,
            input.dependencies.emailVerificationTtlMilliseconds,
        );

    const auth =
        await input.dependencies
            .betterAuth
            .prepareInvitationSignUp({
                userId,

                email:
                    input.email,

                password:
                    input.input.password,

                sessionId,

                verificationId,
            });

    const user =
        createUser({
            userId,

            email:
                input.email,

            now:
                nowTimestamp,
        });

    const profile =
        createUserProfile({
            profileId,

            userId,

            displayName:
                input.input.displayName,

            locale:
                input.input.locale,

            timezone:
                input.input.timezone,

            now:
                nowTimestamp,
        });

    const credential =
        createCredential({
            credentialId,

            userId,

            provider:
                auth.provider,

            providerCredentialId:
                auth.providerCredentialId,

            now:
                nowTimestamp,
        });

    const session =
        createSession({
            sessionId,

            userId,

            provider:
                auth.provider,

            providerSessionId:
                auth.providerSessionId,

            issuedAt,

            expiresAt:
                sessionExpiresAt,

            now:
                nowTimestamp,
        });

    const verification =
        createEmailVerification({
            verificationId,

            userId,

            email:
                input.email,

            provider:
                auth.provider,

            providerVerificationId:
                auth.providerVerificationId,

            requestedAt:
                nowTimestamp,

            expiresAt:
                verificationExpiresAt,
        });

    await commitIdentityChanges({
        dependencies:
            input.dependencies,

        context:
            input.context,

        aggregateType:
            "identity.user",

        aggregateId:
            userId,

        stateChanges:
            createNewIdentityStateChanges({
                collections:
                    input.dependencies.collections,

                user,

                profile,

                credential,

                session,

                verification,
            }),

        events:
            createNewIdentityEvents({
                dependencies:
                    input.dependencies,

                context:
                    input.context,

                invitation:
                    input.invitation,

                user,

                profile,

                credential,

                session,

                verification,

                occurredAt:
                    nowTimestamp,
            }),

        outbox:
            createOutboxMessages({
                dependencies:
                    input.dependencies,

                context:
                    input.context,

                invitation:
                    input.invitation,

                user,

                verification,

                occurredAt:
                    nowTimestamp,
            }),
    });

    return {
        userId,

        sessionId,

        status:
            "pending_email_verification",

        emailVerificationRequired:
            true,
    };
}

// -----------------------------------------------------------------------------
// EXISTING IDENTITY SESSION
// -----------------------------------------------------------------------------

async function createExistingIdentitySession(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly input:
        InvitationSignUpRequest;

        readonly context:
        RuntimeContext;

        readonly invitation:
        VerifiedInvitation;

        readonly user:
        IdentityUserState;
    },
): Promise<InvitationSignUpResult> {
    const now =
        input.dependencies.clock.now();

    const nowTimestamp =
        input.dependencies.clock.nowTimestamp();

    const sessionId =
        input.dependencies.ids.createSessionId();

    const issuedAt =
        nowTimestamp;

    const sessionExpiresAt =
        addMilliseconds(
            now,
            input.dependencies.sessionTtlMilliseconds,
        );

    const auth =
        await input.dependencies
            .betterAuth
            .prepareInvitationSignUp({
                userId:
                    input.user.userId,

                email:
                    input.user.email,

                password:
                    input.input.password,

                sessionId,

                verificationId:
                    input.dependencies
                        .ids
                        .createEmailVerificationId(),
            });

    const session =
        createSession({
            sessionId,

            userId:
                input.user.userId,

            provider:
                auth.provider,

            providerSessionId:
                auth.providerSessionId,

            issuedAt,

            expiresAt:
                sessionExpiresAt,

            now:
                nowTimestamp,
        });

    await commitIdentityChanges({
        dependencies:
            input.dependencies,

        context:
            input.context,

        aggregateType:
            "identity.user",

        aggregateId:
            input.user.userId,

        stateChanges: [
            insert(
                input.dependencies.collections.sessions,
                session,
            ),
        ],

        events: [
            event({
                dependencies:
                    input.dependencies,

                context:
                    input.context,

                aggregateType:
                    "identity.session",

                aggregateId:
                    session.sessionId,

                eventType:
                    "identity.session.created",

                occurredAt:
                    nowTimestamp,

                payload:
                    session as unknown as
                    Record<string, unknown>,
            }),

            event({
                dependencies:
                    input.dependencies,

                context:
                    input.context,

                aggregateType:
                    "identity.user",

                aggregateId:
                    input.user.userId,

                eventType:
                    "identity.invitation_redemption.requested",

                occurredAt:
                    nowTimestamp,

                payload: {
                    invitationId:
                        input.invitation.invitationId,

                    userId:
                        input.user.userId,

                    email:
                        input.user.email,

                    targetTenantId:
                        input.invitation.targetTenantId,

                    requestedAt:
                        nowTimestamp,
                },
            }),
        ],

        outbox: [
            outbox({
                dependencies:
                    input.dependencies,

                context:
                    input.context,

                subject:
                    input.dependencies
                        .outboxSubjects
                        .invitationRedemptionRequested,

                occurredAt:
                    nowTimestamp,

                payload: {
                    invitationId:
                        input.invitation.invitationId,

                    userId:
                        input.user.userId,

                    email:
                        input.user.email,

                    targetTenantId:
                        input.invitation.targetTenantId,

                    requestedAt:
                        nowTimestamp,
                },
            }),
        ],
    });

    return {
        userId:
            input.user.userId,

        sessionId,

        status:
            input.user.status ===
                "active"
                ? "active"
                : "pending_email_verification",

        emailVerificationRequired:
            !input.user.emailVerified,
    };
}

// -----------------------------------------------------------------------------
// STATE CHANGES
// -----------------------------------------------------------------------------

function createNewIdentityStateChanges(
    input: {
        readonly collections:
        IdentityCollections;

        readonly user:
        IdentityUserState;

        readonly profile:
        IdentityUserProfileState;

        readonly credential:
        IdentityCredentialState;

        readonly session:
        IdentitySessionState;

        readonly verification:
        IdentityEmailVerificationState;
    },
): readonly StateChange[] {
    return [
        insert(
            input.collections.users,
            input.user,
        ),

        insert(
            input.collections.userProfiles,
            input.profile,
        ),

        insert(
            input.collections.credentials,
            input.credential,
        ),

        insert(
            input.collections.sessions,
            input.session,
        ),

        insert(
            input.collections.emailVerifications,
            input.verification,
        ),
    ];
}

// -----------------------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------------------

function createNewIdentityEvents(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly context:
        RuntimeContext;

        readonly invitation:
        VerifiedInvitation;

        readonly user:
        IdentityUserState;

        readonly profile:
        IdentityUserProfileState;

        readonly credential:
        IdentityCredentialState;

        readonly session:
        IdentitySessionState;

        readonly verification:
        IdentityEmailVerificationState;

        readonly occurredAt:
        string;
    },
): readonly ReplayableEvent[] {
    return [
        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.user",

            aggregateId:
                input.user.userId,

            eventType:
                "identity.user.created",

            occurredAt:
                input.occurredAt,

            payload:
                input.user as unknown as
                Record<string, unknown>,
        }),

        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.user_profile",

            aggregateId:
                input.profile.profileId,

            eventType:
                "identity.user_profile.created",

            occurredAt:
                input.occurredAt,

            payload:
                input.profile as unknown as
                Record<string, unknown>,
        }),

        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.credential",

            aggregateId:
                input.credential.credentialId,

            eventType:
                "identity.credential.added",

            occurredAt:
                input.occurredAt,

            payload:
                input.credential as unknown as
                Record<string, unknown>,
        }),

        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.session",

            aggregateId:
                input.session.sessionId,

            eventType:
                "identity.session.created",

            occurredAt:
                input.occurredAt,

            payload:
                input.session as unknown as
                Record<string, unknown>,
        }),

        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.email_verification",

            aggregateId:
                input.verification.verificationId,

            eventType:
                "identity.email_verification.requested",

            occurredAt:
                input.occurredAt,

            payload:
                input.verification as unknown as
                Record<string, unknown>,
        }),

        event({
            dependencies:
                input.dependencies,

            context:
                input.context,

            aggregateType:
                "identity.user",

            aggregateId:
                input.user.userId,

            eventType:
                "identity.invitation_redemption.requested",

            occurredAt:
                input.occurredAt,

            payload: {
                invitationId:
                    input.invitation.invitationId,

                userId:
                    input.user.userId,

                email:
                    input.user.email,

                targetTenantId:
                    input.invitation.targetTenantId,

                requestedAt:
                    input.occurredAt,
            },
        }),
    ];
}

// -----------------------------------------------------------------------------
// OUTBOX
// -----------------------------------------------------------------------------

function createOutboxMessages(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly context:
        RuntimeContext;

        readonly invitation:
        VerifiedInvitation;

        readonly user:
        IdentityUserState;

        readonly verification:
        IdentityEmailVerificationState;

        readonly occurredAt:
        string;
    },
): readonly OutboxMessage[] {
    return [
        outbox({
            dependencies:
                input.dependencies,

            context:
                input.context,

            subject:
                input.dependencies
                    .outboxSubjects
                    .emailVerificationRequested,

            occurredAt:
                input.occurredAt,

            payload: {
                verificationId:
                    input.verification.verificationId,

                userId:
                    input.user.userId,

                email:
                    input.user.email,

                requestedAt:
                    input.occurredAt,
            },
        }),

        outbox({
            dependencies:
                input.dependencies,

            context:
                input.context,

            subject:
                input.dependencies
                    .outboxSubjects
                    .invitationRedemptionRequested,

            occurredAt:
                input.occurredAt,

            payload: {
                invitationId:
                    input.invitation.invitationId,

                userId:
                    input.user.userId,

                email:
                    input.user.email,

                targetTenantId:
                    input.invitation.targetTenantId,

                requestedAt:
                    input.occurredAt,
            },
        }),
    ];
}

// -----------------------------------------------------------------------------
// COMMIT
// -----------------------------------------------------------------------------

async function commitIdentityChanges(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly context:
        RuntimeContext;

        readonly aggregateType:
        string;

        readonly aggregateId:
        string;

        readonly stateChanges:
        readonly StateChange[];

        readonly events:
        readonly ReplayableEvent[];

        readonly outbox:
        readonly OutboxMessage[];
    },
): Promise<void> {
    try {
        await input.dependencies.engine.state.commit({
            context:
                input.context,

            aggregate: {
                aggregateType:
                    input.aggregateType,

                aggregateId:
                    input.aggregateId,
            },

            stateChanges:
                input.stateChanges,

            events:
                input.events,

            outbox:
                input.outbox,
        });
    } catch (
    error
    ) {
        console.error(
            "Identity Engine commit failed.",
            error,
        );

        throw new IdentityCommitFailedError();
    }
}

// -----------------------------------------------------------------------------
// RECORD HELPERS
// -----------------------------------------------------------------------------

function insert<T extends object>(
    collection:
        string,

    document:
        T,
): StateChange {
    return {
        operation:
            "insert",

        collection,

        document:
            document as unknown as
            Readonly<Record<string, unknown>>,
    } as StateChange;
}

function event(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

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
    },
): ReplayableEvent {
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
            metadata(
                input.context,
            ),
    } as ReplayableEvent;
}

function outbox(
    input: {
        readonly dependencies:
        InvitationSignUpUseCaseDependencies;

        readonly context:
        RuntimeContext;

        readonly subject:
        string;

        readonly occurredAt:
        string;

        readonly payload:
        Record<string, unknown>;
    },
): OutboxMessage {
    return {
        messageId:
            input.dependencies.ids.createOutboxMessageId(),

        subject:
            input.subject,

        occurredAt:
            input.occurredAt,

        payload:
            input.payload,

        metadata:
            metadata(
                input.context,
            ),
    } as OutboxMessage;
}

function metadata(
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

// -----------------------------------------------------------------------------
// DATE HELPERS
// -----------------------------------------------------------------------------

function addMilliseconds(
    date:
        Date,

    milliseconds:
        number,
): string {
    return new Date(
        date.getTime() +
        milliseconds,
    ).toISOString();
}