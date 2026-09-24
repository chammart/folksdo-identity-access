// services/access/src/reactions/membership/on-membership-activated.ts
// -----------------------------------------------------------------------------
// ON MEMBERSHIP ACTIVATED
// -----------------------------------------------------------------------------
// Reacts to the Membership Operations™ membership-activated business event.
//
// Trigger:
//   membership.membership.activated
//
// Purpose:
//   • update the Access-known Membership fact to active
//   • establish Membership eligibility for authorization evaluation
//   • activate Access assignments waiting for valid Membership participation
//   • preserve Membership Operations™ ownership of Membership lifecycle
//
// Boundary:
//   • does not activate the Membership
//   • does not resolve the actor's active Membership context
//   • does not mutate Access assignments directly
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

export const membershipActivatedSubject =
    "membership.membership.activated";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface MembershipActivatedPayload {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ActivateMembershipAuthorizationRequest {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ActivateMembershipAuthorizationResult {
    /**
     * Indicates whether the Access-known Membership fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of pending Access assignments activated.
     */
    readonly affectedAssignmentCount: number;
}

/**
 * Access-owned operation that applies the authorization consequences of a
 * Membership becoming active.
 */
export interface ActivateMembershipAuthorizationOperation {
    execute(
        request: ActivateMembershipAuthorizationRequest,
    ): Promise<ActivateMembershipAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnMembershipActivatedReactionInput {
    readonly activateMembershipAuthorization:
    ActivateMembershipAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnMembershipActivatedReaction(
    input: CreateOnMembershipActivatedReactionInput,
): AccessReactionHandler<MembershipActivatedPayload> {
    const {
        activateMembershipAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<MembershipActivatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== membershipActivatedSubject
            ) {
                return accessReactionIgnored(
                    "event_subject_unsupported",
                );
            }

            const payload =
                requireReactionPayloadObject(
                    event.payload,
                );

            const membershipId =
                requireReactionString(
                    payload.membershipId,
                    "membershipId",
                );

            const identityId =
                requireReactionString(
                    payload.identityId,
                    "identityId",
                );

            const tenantId =
                requireReactionString(
                    payload.tenantId,
                    "tenantId",
                );

            const result =
                await activateMembershipAuthorization.execute({
                    membershipId,
                    identityId,
                    tenantId,

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