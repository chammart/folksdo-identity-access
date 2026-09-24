// services/access/src/reactions/identity/on-user-disabled.ts
// -----------------------------------------------------------------------------
// ON IDENTITY USER DISABLED
// -----------------------------------------------------------------------------
// Reacts to the Identity Operations™ user-disabled business event.
//
// Trigger:
//   identity.user_disabled
//
// Purpose:
//   • update the Access-known Identity fact to disabled
//   • suspend authorization assignments associated with the Identity
//   • prevent disabled Identities from receiving authorization approvals
//   • preserve authorization history for replay and audit
//
// Boundary:
//   • Identity Operations™ owns Identity disablement
//   • Access Operations™ owns authorization consequences
//   • this reaction does not manipulate assignments directly
//   • this reaction invokes the Access-owned suspension use case
//   • transport retry and acknowledgment remain worker responsibilities
// -----------------------------------------------------------------------------

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
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const identityUserDisabledSubject =
    "identity.user_disabled";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface IdentityUserDisabledPayload {
    readonly identityId: string;

    /**
     * Optional Identity-owned business reason for disablement.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface SuspendIdentityAuthorizationRequest {
    readonly identityId: string;

    readonly reason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface SuspendIdentityAuthorizationResult {
    /**
     * Indicates whether the known Identity fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access-owned authorization assignments changed.
     */
    readonly affectedAssignmentCount: number;
}

export interface SuspendIdentityAuthorizationOperation {
    execute(
        request: SuspendIdentityAuthorizationRequest,
    ): Promise<SuspendIdentityAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnUserDisabledReactionInput {
    readonly suspendIdentityAuthorization:
    SuspendIdentityAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnUserDisabledReaction(
    input: CreateOnUserDisabledReactionInput,
): AccessReactionHandler<IdentityUserDisabledPayload> {
    const {
        suspendIdentityAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<IdentityUserDisabledPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== identityUserDisabledSubject
            ) {
                return accessReactionIgnored(
                    "event_subject_unsupported",
                );
            }

            const payload =
                requireReactionPayloadObject(
                    event.payload,
                );

            const identityId =
                requireReactionString(
                    payload.identityId,
                    "identityId",
                );

            const reason =
                optionalReactionString(
                    payload.reason,
                    "reason",
                );

            const result =
                await suspendIdentityAuthorization.execute({
                    identityId,

                    reason,

                    occurredAt:
                        reactionEventOccurredAt(
                            event,
                        ),

                    context:
                        buildAccessReactionContext(
                            event,
                        ),
                });

            return accessReactionProcessed(
                result.knownFactChanged
                || result.affectedAssignmentCount > 0,
            );
        },
    };
}