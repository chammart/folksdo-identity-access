// services/access/src/reactions/identity/on-user-restored.ts
// -----------------------------------------------------------------------------
// ON IDENTITY USER RESTORED
// -----------------------------------------------------------------------------
// Reacts to the Identity Operations™ user-restored business event.
//
// Trigger:
//   identity.user_restored
//
// Purpose:
//   • update the Access-known Identity fact to active
//   • restore authorization eligibility for the Identity
//   • restore Access-owned assignments previously suspended because of the
//     Identity lifecycle
//   • preserve Identity Operations™ ownership of global Identity lifecycle
//
// Boundary:
//   • Identity Operations™ owns Identity restoration
//   • Access Operations™ owns authorization restoration consequences
//   • this reaction does not mutate assignments directly
//   • this reaction invokes an Access-owned restoration use case
//   • transport acknowledgment, retry and dead-letter behavior remain external
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

export const identityUserRestoredSubject =
    "identity.user_restored";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

/**
 * Identity-owned event payload consumed by Access Operations™.
 *
 * Access intentionally consumes only the fields required to restore its local
 * Known Identity fact and Identity-sourced authorization state.
 */
export interface IdentityUserRestoredPayload {
    readonly identityId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface RestoreIdentityAuthorizationRequest {
    readonly identityId: string;

    /**
     * Source business-event occurrence time.
     */
    readonly occurredAt: Date;

    /**
     * Canonical trace context derived from the consumed event.
     */
    readonly context: AccessReactionContext;
}

export interface RestoreIdentityAuthorizationResult {
    /**
     * Indicates whether the Access-known Identity fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access-owned assignments restored.
     */
    readonly affectedAssignmentCount: number;
}

/**
 * Narrow contract satisfied by the Access-owned Identity authorization
 * restoration use case during runtime composition.
 */
export interface RestoreIdentityAuthorizationOperation {
    execute(
        request: RestoreIdentityAuthorizationRequest,
    ): Promise<RestoreIdentityAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnUserRestoredReactionInput {
    /**
     * Injected during Access runtime composition.
     */
    readonly restoreIdentityAuthorization:
    RestoreIdentityAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnUserRestoredReaction(
    input: CreateOnUserRestoredReactionInput,
): AccessReactionHandler<IdentityUserRestoredPayload> {
    const {
        restoreIdentityAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<IdentityUserRestoredPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== identityUserRestoredSubject
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
                await restoreIdentityAuthorization.execute({
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
                result.knownFactChanged
                || result.affectedAssignmentCount > 0,
            );
        },
    };
}