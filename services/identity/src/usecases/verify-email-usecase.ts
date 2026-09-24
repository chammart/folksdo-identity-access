// services/identity/src/usecases/verify-email-usecase.ts
// -----------------------------------------------------------------------------
// VERIFY EMAIL USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Email Verification™.
//
// Purpose:
//   • validate pending Identity-owned verification state
//   • delegate token verification mechanics to BetterAuth
//   • mark Email Verification™ as verified
//   • activate the global Identity user
//   • persist replayable Identity business events
//   • persist matching outbox messages for downstream reactions
//   • commit all state, events, and outbox atomically through Folksdo Engine™
// -----------------------------------------------------------------------------

import type { Clock } from "@folksdo-engine/foundation";
import type {
    FolksdoEngine,
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type { VerifyEmailRequest, VerifyEmailResult } from "../api";
import type { BetterAuthIdentityAdapter } from "../adapters";
import { verifyUserEmail } from "../business-rules";
import { IdentityCommitFailedError, InvalidVerificationTokenError } from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentityEmailVerificationState, IdentityUserState } from "../state";
import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "./invitation-sign-up-usecase";

export interface VerifyEmailUseCase {
    execute(input: VerifyEmailRequest, context: RuntimeContext): Promise<VerifyEmailResult>;
}

export interface VerifyEmailUseCaseDependencies {
    readonly engine: Pick<FolksdoEngine, "state">;
    readonly clock: Clock;
    readonly ids: Pick<IdentityIdGenerator, "createEventId" | "createOutboxMessageId">;
    readonly readStore: IdentityReadStore;
    readonly betterAuth: BetterAuthIdentityAdapter;
    readonly collections: Pick<IdentityCollections, "users" | "emailVerifications">;
    readonly outboxSubjects: Pick<
        IdentityOutboxSubjects,
        "userEmailVerified" | "userActivated"
    >;
}

export function createVerifyEmailUseCase(
    dependencies: VerifyEmailUseCaseDependencies,
): VerifyEmailUseCase {
    return {
        async execute(
            input: VerifyEmailRequest,
            context: RuntimeContext,
        ): Promise<VerifyEmailResult> {
            const verification = await dependencies.readStore.findVerificationById(
                input.verificationId,
            );

            if (!verification || verification.status !== "pending") {
                throw new InvalidVerificationTokenError();
            }

            const providerVerification = await dependencies.betterAuth.verifyEmail({
                verificationToken: input.verificationToken,
            });

            const user = await dependencies.readStore.findUserById(
                verification.userId,
            );

            if (!user) {
                throw new InvalidVerificationTokenError();
            }

            const verifiedUser = verifyUserEmail({
                user,
                verifiedAt: providerVerification.verifiedAt,
            });

            const verifiedVerification: IdentityEmailVerificationState = {
                ...verification,
                status: "verified",
                verifiedAt: providerVerification.verifiedAt,
            };

            const occurredAt = dependencies.clock.nowTimestamp();

            try {
                await dependencies.engine.state.commit({
                    context,
                    aggregate: {
                        aggregateType: "identity.user",
                        aggregateId: verifiedUser.userId,
                    },
                    stateChanges: stateChanges({
                        collections: dependencies.collections,
                        user: verifiedUser,
                        verification: verifiedVerification,
                    }),
                    events: events({
                        dependencies,
                        context,
                        user: verifiedUser,
                        verification: verifiedVerification,
                        occurredAt,
                    }),
                    outbox: outboxMessages({
                        dependencies,
                        context,
                        user: verifiedUser,
                        verification: verifiedVerification,
                        occurredAt,
                    }),
                });
            } catch (error) {
                console.error("Identity Verify Email Engine commit failed.", error);

                throw new IdentityCommitFailedError();
            }

            return {
                userId: verifiedUser.userId,
                status: "active",
                emailVerified: true,
            };
        },
    };
}

function stateChanges(input: {
    readonly collections: Pick<IdentityCollections, "users" | "emailVerifications">;
    readonly user: IdentityUserState;
    readonly verification: IdentityEmailVerificationState;
}): readonly StateChange[] {
    return [
        {
            operation: "update",
            collection: input.collections.users,
            key: { userId: input.user.userId },
            patch: {
                status: input.user.status,
                emailVerified: input.user.emailVerified,
                updatedAt: input.user.updatedAt,
                activatedAt: input.user.activatedAt,
            },
        } as StateChange,
        {
            operation: "update",
            collection: input.collections.emailVerifications,
            key: { verificationId: input.verification.verificationId },
            patch: {
                status: input.verification.status,
                verifiedAt: input.verification.verifiedAt,
            },
        } as StateChange,
    ];
}

function events(input: {
    readonly dependencies: VerifyEmailUseCaseDependencies;
    readonly context: RuntimeContext;
    readonly user: IdentityUserState;
    readonly verification: IdentityEmailVerificationState;
    readonly occurredAt: string;
}): readonly ReplayableEvent[] {
    return [
        event({
            dependencies: input.dependencies,
            context: input.context,
            aggregateType: "identity.user",
            aggregateId: input.user.userId,
            eventType: "identity.user_email_verified",
            occurredAt: input.occurredAt,
            payload: userEmailVerifiedPayload({
                user: input.user,
                verification: input.verification,
            }),
        }),
        event({
            dependencies: input.dependencies,
            context: input.context,
            aggregateType: "identity.user",
            aggregateId: input.user.userId,
            eventType: "identity.user.activated",
            occurredAt: input.occurredAt,
            payload: userActivatedPayload(input.user),
        }),
    ];
}

function outboxMessages(input: {
    readonly dependencies: VerifyEmailUseCaseDependencies;
    readonly context: RuntimeContext;
    readonly user: IdentityUserState;
    readonly verification: IdentityEmailVerificationState;
    readonly occurredAt: string;
}): readonly OutboxMessage[] {
    return [
        outbox({
            dependencies: input.dependencies,
            context: input.context,
            subject: input.dependencies.outboxSubjects.userEmailVerified,
            occurredAt: input.occurredAt,
            payload: userEmailVerifiedPayload({
                user: input.user,
                verification: input.verification,
            }),
        }),
        outbox({
            dependencies: input.dependencies,
            context: input.context,
            subject: input.dependencies.outboxSubjects.userActivated,
            occurredAt: input.occurredAt,
            payload: userActivatedPayload(input.user),
        }),
    ];
}

function userEmailVerifiedPayload(input: {
    readonly user: IdentityUserState;
    readonly verification: IdentityEmailVerificationState;
}): Record<string, unknown> {
    return {
        userId: input.user.userId,
        email: input.user.email,
        verifiedAt: input.verification.verifiedAt,
    };
}

function userActivatedPayload(user: IdentityUserState): Record<string, unknown> {
    return {
        userId: user.userId,
        activatedAt: user.activatedAt,
    };
}

function event(input: {
    readonly dependencies: VerifyEmailUseCaseDependencies;
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
    readonly dependencies: VerifyEmailUseCaseDependencies;
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
