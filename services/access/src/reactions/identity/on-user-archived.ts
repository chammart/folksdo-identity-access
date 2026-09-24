// services/access/src/reactions/identity/on-user-archived.ts
// -----------------------------------------------------------------------------
// ON IDENTITY USER ARCHIVED
// -----------------------------------------------------------------------------
// Reacts to the Identity Operations™ user-archived business event.
//
// Trigger:
//   identity.user_archived
//
// Purpose:
//   • update the Access-known Identity fact to archived
//   • archive authorization assignments associated with the Identity
//   • permanently exclude the Identity from authorization evaluation
//   • preserve historical authorization state for replay and audit
//
// Boundary:
//   • Identity Operations™ owns Identity archival
//   • Access Operations™ owns authorization archival consequences
//   • this reaction does not mutate assignments directly
//   • this reaction invokes the Access-owned archival use case
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

export const identityUserArchivedSubject =
    "identity.user_archived";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface IdentityUserArchivedPayload {
    readonly identityId: string;

    /**
     * Optional Identity-owned business reason for archival.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ArchiveIdentityAccessRequest {
    readonly identityId: string;

    readonly reason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ArchiveIdentityAccessResult {
    /**
     * Indicates whether the known Identity fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access-owned authorization assignments archived.
     */
    readonly affectedAssignmentCount: number;
}

export interface ArchiveIdentityAccessOperation {
    execute(
        request: ArchiveIdentityAccessRequest,
    ): Promise<ArchiveIdentityAccessResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnUserArchivedReactionInput {
    readonly archiveIdentityAccess:
    ArchiveIdentityAccessOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnUserArchivedReaction(
    input: CreateOnUserArchivedReactionInput,
): AccessReactionHandler<IdentityUserArchivedPayload> {
    const {
        archiveIdentityAccess,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<IdentityUserArchivedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== identityUserArchivedSubject
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
                await archiveIdentityAccess.execute({
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