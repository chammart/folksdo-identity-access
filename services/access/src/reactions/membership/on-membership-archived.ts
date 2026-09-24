// services/access/src/reactions/membership/on-membership-archived.ts
// -----------------------------------------------------------------------------
// ON MEMBERSHIP ARCHIVED
// -----------------------------------------------------------------------------
// Reacts to the Membership Operations™ membership-archived business event.
//
// Trigger:
//   membership.membership.archived
//
// Purpose:
//   • update the Access-known Membership fact to archived
//   • archive Access assignments associated with the Membership
//   • permanently exclude the Membership from authorization evaluation
//   • preserve historical authorization state for replay and audit
//
// Boundary:
//   • Membership Operations™ owns Membership archival
//   • Access Operations™ owns authorization archival consequences
//   • does not mutate assignments directly
//   • invokes an Access-owned archival operation
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
    optionalReactionString,
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const membershipArchivedSubject =
    "membership.membership.archived";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface MembershipArchivedPayload {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    /**
     * Optional Membership-owned reason for archival.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ArchiveMembershipAuthorizationRequest {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly reason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ArchiveMembershipAuthorizationResult {
    /**
     * Indicates whether the Access-known Membership fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access assignments archived.
     */
    readonly affectedAssignmentCount: number;
}

export interface ArchiveMembershipAuthorizationOperation {
    execute(
        request: ArchiveMembershipAuthorizationRequest,
    ): Promise<ArchiveMembershipAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnMembershipArchivedReactionInput {
    readonly archiveMembershipAuthorization:
    ArchiveMembershipAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnMembershipArchivedReaction(
    input: CreateOnMembershipArchivedReactionInput,
): AccessReactionHandler<MembershipArchivedPayload> {
    const {
        archiveMembershipAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<MembershipArchivedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== membershipArchivedSubject
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
                await archiveMembershipAuthorization.execute({
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