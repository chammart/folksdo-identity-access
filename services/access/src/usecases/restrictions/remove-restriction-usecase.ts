// services/access/src/usecases/restrictions/remove-restriction-usecase.ts
// -----------------------------------------------------------------------------
// REMOVE ACCESS RESTRICTION USE CASE
// -----------------------------------------------------------------------------
// Removes an existing Access-owned authorization Restriction.
//
// Boundary:
//   • resolves canonical Restriction state
//   • delegates lifecycle validation and mutation to Access business rules
//   • commits canonical state, event and outbox message atomically
//   • preserves historical Restriction state
//   • prevents removed Restrictions from participating in authorization
// -----------------------------------------------------------------------------

import {
    removeRestriction,
} from "../../business-rules";

import {
    RestrictionNotFoundError,
} from "../../errors";

import {
    commitAccess,
    toAccessRestrictionResult,
} from "../shared";

import type {
    AccessRestrictionResult,
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface RemoveRestrictionRequest {
    readonly restrictionId: string;

    readonly removedBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class RemoveRestrictionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: RemoveRestrictionRequest,
    ): Promise<AccessRestrictionResult> {
        const existingRestriction =
            await this.dependencies.readStore.findRestrictionById(
                request.restrictionId,
            );

        if (existingRestriction === null) {
            throw new RestrictionNotFoundError(
                request.restrictionId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const removedRestriction =
            removeRestriction({
                restriction:
                    existingRestriction,

                removedBy:
                    request.removedBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.restriction",

                aggregateId:
                    removedRestriction.restrictionId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .accessRestrictions,

                        documentId:
                            removedRestriction.restrictionId,

                        patch: {
                            ...removedRestriction,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.restriction.removed",

                        aggregateType:
                            "access.restriction",

                        aggregateId:
                            removedRestriction.restrictionId,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                removedRestriction.restrictionId,

                            target:
                                removedRestriction.target,

                            restrictionReason:
                                removedRestriction.restrictionReason,

                            status:
                                removedRestriction.status,

                            effectiveFrom:
                                removedRestriction.effectiveFrom,

                            expiresAt:
                                removedRestriction.expiresAt,

                            removedAt:
                                removedRestriction.removedAt,

                            removedBy:
                                removedRestriction.removedBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects
                                .restrictionRemoved,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                removedRestriction.restrictionId,

                            target:
                                removedRestriction.target,

                            restrictionReason:
                                removedRestriction.restrictionReason,

                            status:
                                removedRestriction.status,

                            effectiveFrom:
                                removedRestriction.effectiveFrom,

                            expiresAt:
                                removedRestriction.expiresAt,

                            removedAt:
                                removedRestriction.removedAt,

                            removedBy:
                                removedRestriction.removedBy,
                        },
                    },
                ],
            },
        );

        return toAccessRestrictionResult(
            removedRestriction,
        );
    }
}