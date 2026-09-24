// services/access/src/usecases/expirations/expire-restriction-usecase.ts
// -----------------------------------------------------------------------------
// EXPIRE ACCESS RESTRICTION USE CASE
// -----------------------------------------------------------------------------
// Expires an Access-owned Restriction whose expiration boundary has been
// reached.
//
// Boundary:
//   • resolves canonical Restriction state
//   • delegates expiration validation and mutation to Access business rules
//   • commits canonical state, event and outbox message atomically
//   • preserves historical Restriction state
//   • prevents expired Restrictions from participating in authorization
//   • remains safe for worker-driven execution
// -----------------------------------------------------------------------------

import {
    expireRestriction,
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

export interface ExpireRestrictionRequest {
    readonly restrictionId: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ExpireRestrictionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ExpireRestrictionRequest,
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

        const expiredRestriction =
            expireRestriction({
                restriction:
                    existingRestriction,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.restriction",

                aggregateId:
                    expiredRestriction.restrictionId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .accessRestrictions,

                        documentId:
                            expiredRestriction.restrictionId,

                        patch: {
                            ...expiredRestriction,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.restriction.expired",

                        aggregateType:
                            "access.restriction",

                        aggregateId:
                            expiredRestriction.restrictionId,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                expiredRestriction.restrictionId,

                            target:
                                expiredRestriction.target,

                            restrictionReason:
                                expiredRestriction.restrictionReason,

                            status:
                                expiredRestriction.status,

                            effectiveFrom:
                                expiredRestriction.effectiveFrom,

                            expiresAt:
                                expiredRestriction.expiresAt,

                            expiredAt:
                                expiredRestriction.expiredAt,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects
                                .restrictionExpired,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                expiredRestriction.restrictionId,

                            target:
                                expiredRestriction.target,

                            restrictionReason:
                                expiredRestriction.restrictionReason,

                            status:
                                expiredRestriction.status,

                            effectiveFrom:
                                expiredRestriction.effectiveFrom,

                            expiresAt:
                                expiredRestriction.expiresAt,

                            expiredAt:
                                expiredRestriction.expiredAt,
                        },
                    },
                ],
            },
        );

        return toAccessRestrictionResult(
            expiredRestriction,
        );
    }
}