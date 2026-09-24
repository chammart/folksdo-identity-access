// services/access/src/usecases/restrictions/create-restriction-usecase.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS RESTRICTION USE CASE
// -----------------------------------------------------------------------------
// Creates an explicit Access-owned authorization Restriction.
//
// Boundary:
//   • delegates canonical Restriction creation to Access business rules
//   • initializes an active Restriction with deterministic applicability
//   • commits canonical state, event and outbox message atomically
//   • only reduces authorization capability
//   • does not perform authorization evaluation
// -----------------------------------------------------------------------------

import {
    createRestriction,
} from "../../business-rules";

import type {
    AccessRestrictionTarget,
} from "../../state";

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

export interface CreateRestrictionRequest {
    readonly target: AccessRestrictionTarget;

    readonly tenantId?: string;

    readonly restrictionReason: string;

    readonly effectiveFrom?: string;

    readonly expiresAt?: string;

    readonly createdBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class CreateRestrictionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: CreateRestrictionRequest,
    ): Promise<AccessRestrictionResult> {
        const now =
            this.dependencies.clock.now();

        const restriction =
            createRestriction({
                restrictionId:
                    this.dependencies.ids.restrictionId(),

                target:
                    request.target,

                tenantId:
                    request.tenantId,

                restrictionReason:
                    request.restrictionReason,

                effectiveFrom:
                    request.effectiveFrom ??
                    now,

                expiresAt:
                    request.expiresAt,

                createdBy:
                    request.createdBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.restriction",

                aggregateId:
                    restriction.restrictionId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections
                                .accessRestrictions,

                        document: {
                            ...restriction,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.restriction.created",

                        aggregateType:
                            "access.restriction",

                        aggregateId:
                            restriction.restrictionId,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                restriction.restrictionId,

                            tenantId:
                                restriction.tenantId,

                            target:
                                restriction.target,

                            restrictionReason:
                                restriction.restrictionReason,

                            status:
                                restriction.status,

                            effectiveFrom:
                                restriction.effectiveFrom,

                            expiresAt:
                                restriction.expiresAt,

                            createdBy:
                                restriction.createdBy,

                            createdAt:
                                restriction.createdAt,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects
                                .restrictionCreated,

                        occurredAt:
                            now,

                        payload: {
                            restrictionId:
                                restriction.restrictionId,

                            tenantId:
                                restriction.tenantId,

                            target:
                                restriction.target,

                            restrictionReason:
                                restriction.restrictionReason,

                            status:
                                restriction.status,

                            effectiveFrom:
                                restriction.effectiveFrom,

                            expiresAt:
                                restriction.expiresAt,

                            createdBy:
                                restriction.createdBy,

                            createdAt:
                                restriction.createdAt,
                        },
                    },
                ],
            },
        );

        return toAccessRestrictionResult(
            restriction,
        );
    }
}