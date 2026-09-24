// services/access/src/reactions/identity/on-user-activated.ts
// -----------------------------------------------------------------------------
// ON IDENTITY USER ACTIVATED
// -----------------------------------------------------------------------------
// Reacts to the Identity Operations™ user-activated business event.
//
// Trigger:
//   identity.user.activated
//
// Purpose:
//   • update the Access-known Identity fact to active
//   • make the Identity eligible for authorization evaluation
//   • preserve Identity Operations™ ownership of lifecycle state
//
// Boundary:
//   • does not activate the Identity
//   • does not authenticate the Identity
//   • does not create assignments or permissions
//   • does not manipulate persistence directly
//   • invokes an Access-owned application operation
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
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const identityUserActivatedSubject =
    "identity.user.activated";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface IdentityUserActivatedPayload {
    readonly userId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ActivateKnownIdentityRequest {
    readonly identityId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ActivateKnownIdentityResult {
    /**
     * Indicates whether the known fact or authorization eligibility changed.
     */
    readonly changed: boolean;
}

export interface ActivateKnownIdentityOperation {
    execute(
        request: ActivateKnownIdentityRequest,
    ): Promise<ActivateKnownIdentityResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnUserActivatedReactionInput {
    readonly activateKnownIdentity:
    ActivateKnownIdentityOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnUserActivatedReaction(
    input: CreateOnUserActivatedReactionInput,
): AccessReactionHandler<IdentityUserActivatedPayload> {
    const {
        activateKnownIdentity,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<IdentityUserActivatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== identityUserActivatedSubject
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
                    payload.userId,
                    "userId",
                );

            const result =
                await activateKnownIdentity.execute({
                    identityId,

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
                result.changed,
            );
        },
    };
}