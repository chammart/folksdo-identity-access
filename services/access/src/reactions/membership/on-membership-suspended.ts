// services/access/src/reactions/membership/on-membership-suspended.ts
// -----------------------------------------------------------------------------
// ON MEMBERSHIP SUSPENDED
// -----------------------------------------------------------------------------
// Reacts to the Membership Operations™ membership-suspended business event.
//
// Trigger:
//   membership.membership.suspended
//
// Purpose:
//   • update the Access-known Membership fact to suspended
//   • suspend authorization assignments associated with the Membership
//   • prevent authorization through invalid tenant participation
//   • preserve authorization history for replay and audit
//
// Boundary:
//   • Membership Operations™ owns Membership suspension
//   • Access Operations™ owns authorization suspension consequences
//   • does not manipulate assignments directly
//   • invokes an Access-owned suspension operation
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

export const membershipSuspendedSubject =
    "membership.membership.suspended";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface MembershipSuspendedPayload {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    /**
     * Optional Membership-owned reason for suspension.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface SuspendMembershipAuthorizationRequest {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly reason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface SuspendMembershipAuthorizationResult {
    /**
     * Indicates whether the Access-known Membership fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access assignments suspended.
     */
    readonly affectedAssignmentCount: number;
}

export interface SuspendMembershipAuthorizationOperation {
    execute(
        request: SuspendMembershipAuthorizationRequest,
    ): Promise<SuspendMembershipAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnMembershipSuspendedReactionInput {
    readonly suspendMembershipAuthorization:
    SuspendMembershipAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnMembershipSuspendedReaction(
    input: CreateOnMembershipSuspendedReactionInput,
): AccessReactionHandler<MembershipSuspendedPayload> {
    const {
        suspendMembershipAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<MembershipSuspendedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== membershipSuspendedSubject
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

            const reason =
                optionalReactionString(
                    payload.reason,
                    "reason",
                );

            const result =
                await suspendMembershipAuthorization.execute({
                    membershipId,
                    identityId,
                    tenantId,
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