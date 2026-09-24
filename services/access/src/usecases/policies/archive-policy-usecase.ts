// services/access/src/usecases/policies/archive-policy-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE AUTHORIZATION POLICY USE CASE
// -----------------------------------------------------------------------------
// Archives an existing Access-owned Authorization Policy.
//
// Boundary:
//   • resolves canonical Authorization Policy state
//   • delegates lifecycle validation and mutation to Access business rules
//   • commits state, event and outbox message atomically
//   • prevents archived Policies from participating in authorization
//   • preserves Policy history and version
// -----------------------------------------------------------------------------

import {
    archivePolicy,
} from "../../business-rules";

import {
    AuthorizationPolicyNotFoundError,
} from "../../errors";

import {
    commitAccess,
    toAccessPolicyResult,
} from "../shared";

import type {
    AccessPolicyResult,
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ArchivePolicyRequest {
    readonly policyId: string;

    readonly archivedBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ArchivePolicyUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ArchivePolicyRequest,
    ): Promise<AccessPolicyResult> {
        const existingPolicy =
            await this.dependencies.readStore.findPolicyById(
                request.policyId,
            );

        if (existingPolicy === null) {
            throw new AuthorizationPolicyNotFoundError(
                request.policyId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const archivedPolicy =
            archivePolicy({
                policy:
                    existingPolicy,

                archivedBy:
                    request.archivedBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.authorization-policy",

                aggregateId:
                    archivedPolicy.policyId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .authorizationPolicies,

                        documentId:
                            archivedPolicy.policyId,

                        patch: {
                            ...archivedPolicy,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.authorization-policy.archived",

                        aggregateType:
                            "access.authorization-policy",

                        aggregateId:
                            archivedPolicy.policyId,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                archivedPolicy.policyId,

                            name:
                                archivedPolicy.name,

                            scope:
                                archivedPolicy.scope,

                            tenantId:
                                archivedPolicy.tenantId,

                            version:
                                archivedPolicy.version,

                            lifecycleStatus:
                                archivedPolicy.lifecycleStatus,

                            archivedAt:
                                archivedPolicy.archivedAt,

                            archivedBy:
                                archivedPolicy.archivedBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.policyArchived,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                archivedPolicy.policyId,

                            name:
                                archivedPolicy.name,

                            scope:
                                archivedPolicy.scope,

                            tenantId:
                                archivedPolicy.tenantId,

                            version:
                                archivedPolicy.version,

                            lifecycleStatus:
                                archivedPolicy.lifecycleStatus,

                            archivedAt:
                                archivedPolicy.archivedAt,

                            archivedBy:
                                archivedPolicy.archivedBy,
                        },
                    },
                ],
            },
        );

        return toAccessPolicyResult(
            archivedPolicy,
        );
    }
}