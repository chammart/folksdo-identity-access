// services/access/src/reactions/membership/on-membership-reactivated.ts
// -----------------------------------------------------------------------------
// ON MEMBERSHIP REACTIVATED
// -----------------------------------------------------------------------------
// Reacts to the Membership Operations™ membership-reactivated business event.
//
// Trigger:
//   membership.membership.reactivated
//
// Purpose:
//   • update the Access-known Membership fact to active
//   • restore assignments suspended specifically by Membership suspension
//   • restore Membership eligibility for authorization evaluation
//   • preserve unrelated suspension and restriction causes
//
// Boundary:
//   • Membership Operations™ owns Membership reactivation
//   • Access Operations™ owns authorization restoration consequences
//   • does not restore assignments blocked by other suspension sources
//   • does not manipulate assignments directly
//   • invokes an Access-owned reactivation operation
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

export const membershipReactivatedSubject =
    "membership.membership.reactivated";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface MembershipReactivatedPayload {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ReactivateMembershipAuthorizationRequest {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ReactivateMembershipAuthorizationResult {
    /**
     * Indicates whether the Access-known Membership fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Membership-suspended assignments restored.
     */
    readonly affectedAssignmentCount: number;
}

export interface ReactivateMembershipAuthorizationOperation {
    execute(
        request: ReactivateMembershipAuthorizationRequest,
    ): Promise<ReactivateMembershipAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnMembershipReactivatedReactionInput {
    readonly reactivateMembershipAuthorization:
    ReactivateMembershipAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnMembershipReactivatedReaction(
    input: CreateOnMembershipReactivatedReactionInput,
): AccessReactionHandler<MembershipReactivatedPayload> {
    const {
        reactivateMembershipAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<MembershipReactivatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== membershipReactivatedSubject
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
                await reactivateMembershipAuthorization.execute({
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