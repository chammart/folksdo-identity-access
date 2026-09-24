// services/access/src/reactions/identity/on-user-created.ts
// -----------------------------------------------------------------------------
// ON IDENTITY USER CREATED
// -----------------------------------------------------------------------------
// Reacts to the Identity Operations™ user-created business event.
//
// Trigger:
//   identity.user.created
//
// Purpose:
//   • record the newly created Identity as an Access-known business fact
//   • preserve Identity Operations™ ownership of global Identity lifecycle
//   • make replayed event processing deterministic and idempotent
//
// Boundary:
//   • does not create or authenticate the Identity
//   • does not create Access assignments
//   • does not manipulate persistence directly
//   • invokes an Access-owned application operation
//   • contains no transport acknowledgment or retry behavior
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

export const identityUserCreatedSubject =
    "identity.user.created";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

/**
 * Identity-owned payload consumed by Access Operations™.
 *
 * Access intentionally consumes only the fields required to maintain its
 * local Known Identity fact.
 */
export interface IdentityUserCreatedPayload {
    readonly identityId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface RecordKnownIdentityRequest {
    readonly identityId: string;

    readonly status: "pending";

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface RecordKnownIdentityResult {
    /**
     * Indicates whether the Access-known Identity fact changed.
     */
    readonly changed: boolean;
}

/**
 * Narrow Access-owned operation required by this reaction.
 *
 * Runtime composition may satisfy this contract with the corresponding Access
 * use case without exposing persistence or transport concerns.
 */
export interface RecordKnownIdentityOperation {
    execute(
        request: RecordKnownIdentityRequest,
    ): Promise<RecordKnownIdentityResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnUserCreatedReactionInput {
    readonly recordKnownIdentity:
    RecordKnownIdentityOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnUserCreatedReaction(
    input: CreateOnUserCreatedReactionInput,
): AccessReactionHandler<IdentityUserCreatedPayload> {
    const {
        recordKnownIdentity,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<IdentityUserCreatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== identityUserCreatedSubject
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

            const result =
                await recordKnownIdentity.execute({
                    identityId,

                    status:
                        "pending",

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