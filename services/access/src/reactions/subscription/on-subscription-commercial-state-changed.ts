// services/access/src/reactions/subscription/on-subscription-commercial-state-changed.ts
// -----------------------------------------------------------------------------
// ON SUBSCRIPTION COMMERCIAL STATE CHANGED
// -----------------------------------------------------------------------------
// Reacts to authoritative Subscription Operations™ commercial business events.
//
// Supported subjects:
//   subscription.subscription.created
//   subscription.subscription.activated
//   subscription.subscription.suspended
//   subscription.subscription.resumed
//   subscription.subscription.expired
//   subscription.subscription.cancelled
//   subscription.subscription.renewed
//   subscription.subscription.plan_changed
//   subscription.subscription.entitlements_updated
//
// Purpose:
//   • maintain Access-known Subscription commercial capability facts
//   • maintain known Subscription lifecycle eligibility
//   • maintain known commercial effective-period facts
//   • preserve Subscription Operations™ ownership of Entitlement resolution
//   • prevent Access from deriving commercial state independently
//
// Boundary:
//   • Subscription Operations™ owns Subscription and Entitlement state
//   • Access Operations™ owns authorization consequences
//   • Access receives complete capability replacement when capabilities change
//   • lifecycle-only events preserve previously known capabilities
//   • transport acknowledgment, retry and dead-letter behavior remain external
// -----------------------------------------------------------------------------

import type {
    KnownSubscriptionStatus,
} from "../../known-facts";

import type {
    AccessReactionContext,
    AccessReactionEvent,
    AccessReactionHandler,
} from "../access-reaction-contracts";

import {
    accessReactionIgnored,
    accessReactionProcessed,
    type AccessReactionResult,
} from "../access-reaction-results";

import {
    buildAccessReactionContext,
    optionalReactionString,
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
    requireReactionStringArray,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// SUBJECTS
// -----------------------------------------------------------------------------

export const subscriptionCreatedSubject =
    "subscription.subscription.created";

export const subscriptionActivatedSubject =
    "subscription.subscription.activated";

export const subscriptionSuspendedSubject =
    "subscription.subscription.suspended";

export const subscriptionResumedSubject =
    "subscription.subscription.resumed";

export const subscriptionExpiredSubject =
    "subscription.subscription.expired";

export const subscriptionCancelledSubject =
    "subscription.subscription.cancelled";

export const subscriptionRenewedSubject =
    "subscription.subscription.renewed";

export const subscriptionPlanChangedSubject =
    "subscription.subscription.plan_changed";

export const subscriptionEntitlementsUpdatedSubject =
    "subscription.subscription.entitlements_updated";

export const subscriptionCommercialStateSubjects = [
    subscriptionCreatedSubject,
    subscriptionActivatedSubject,
    subscriptionSuspendedSubject,
    subscriptionResumedSubject,
    subscriptionExpiredSubject,
    subscriptionCancelledSubject,
    subscriptionRenewedSubject,
    subscriptionPlanChangedSubject,
    subscriptionEntitlementsUpdatedSubject,
] as const;

export type SubscriptionCommercialStateSubject =
    (typeof subscriptionCommercialStateSubjects)[number];

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ApplySubscriptionCommercialStateRequest {
    readonly tenantId:
    string;

    readonly subscriptionId:
    string;

    readonly status?:
    KnownSubscriptionStatus;

    readonly capabilities?:
    readonly string[];

    readonly effectiveAt?:
    string;

    readonly expiresAt?:
    string;

    readonly context:
    AccessReactionContext;
}

export interface ApplySubscriptionCommercialStateResult {
    readonly knownFactChanged:
    boolean;
}

export interface ApplySubscriptionCommercialStateOperation {
    execute(
        request:
            ApplySubscriptionCommercialStateRequest,
    ): Promise<ApplySubscriptionCommercialStateResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnSubscriptionCommercialStateChangedReactionInput {
    readonly subject:
    SubscriptionCommercialStateSubject;

    readonly applySubscriptionCommercialState:
    ApplySubscriptionCommercialStateOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnSubscriptionCommercialStateChangedReaction(
    input:
        CreateOnSubscriptionCommercialStateChangedReactionInput,
): AccessReactionHandler {
    return {
        async handle(
            event:
                AccessReactionEvent,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== input.subject
            ) {
                return accessReactionIgnored(
                    "event_subject_unsupported",
                );
            }

            const payload =
                requireReactionPayloadObject(
                    event.payload,
                );

            const tenantId =
                requireReactionString(
                    payload.tenantId,
                    "tenantId",
                );

            const subscriptionId =
                requireReactionString(
                    payload.subscriptionId,
                    "subscriptionId",
                );

            const status =
                resolveSubscriptionStatus(
                    input.subject,
                    payload.status,
                );

            const capabilities =
                supportsCapabilities(
                    input.subject,
                )
                    ? requireReactionStringArray(
                        payload.capabilities,
                        "capabilities",
                    )
                    : undefined;

            const occurredAt =
                reactionEventOccurredAt(
                    event,
                )
                    .toISOString();

            const effectiveAt =
                optionalReactionString(
                    payload.effectiveFrom,
                    "effectiveFrom",
                )
                ?? occurredAt;

            const expiresAt =
                optionalReactionString(
                    payload.effectiveThrough,
                    "effectiveThrough",
                );

            const result =
                await input
                    .applySubscriptionCommercialState
                    .execute({
                        tenantId,
                        subscriptionId,
                        status,
                        capabilities,
                        effectiveAt,
                        expiresAt,

                        context:
                            buildAccessReactionContext(
                                event,
                            ),
                    });

            return accessReactionProcessed(
                result.knownFactChanged,
            );
        },
    };
}

// -----------------------------------------------------------------------------
// STATUS RESOLUTION
// -----------------------------------------------------------------------------

function resolveSubscriptionStatus(
    subject:
        SubscriptionCommercialStateSubject,

    payloadStatus:
        unknown,
): KnownSubscriptionStatus | undefined {
    switch (
    subject
    ) {
        case subscriptionCreatedSubject:
            return "pending";

        case subscriptionActivatedSubject:
        case subscriptionResumedSubject:
            return "active";

        case subscriptionSuspendedSubject:
            return "suspended";

        case subscriptionExpiredSubject:
            return "expired";

        case subscriptionCancelledSubject:
            return "cancelled";

        case subscriptionRenewedSubject:
            return undefined;

        case subscriptionPlanChangedSubject:
        case subscriptionEntitlementsUpdatedSubject:
            return requireKnownSubscriptionStatus(
                payloadStatus,
            );
    }
}

// -----------------------------------------------------------------------------
// CAPABILITY-BEARING SUBJECTS
// -----------------------------------------------------------------------------

function supportsCapabilities(
    subject:
        SubscriptionCommercialStateSubject,
): boolean {
    return (
        subject === subscriptionCreatedSubject
        || subject === subscriptionPlanChangedSubject
        || subject === subscriptionEntitlementsUpdatedSubject
    );
}

// -----------------------------------------------------------------------------
// STATUS VALIDATION
// -----------------------------------------------------------------------------

function requireKnownSubscriptionStatus(
    value:
        unknown,
): KnownSubscriptionStatus {
    if (
        value === "pending"
        || value === "active"
        || value === "suspended"
        || value === "expired"
        || value === "cancelled"
    ) {
        return value;
    }

    throw new Error(
        "Subscription reaction payload requires a valid status.",
    );
}