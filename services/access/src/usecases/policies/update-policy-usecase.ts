// services/access/src/usecases/policies/update-policy-usecase.ts
// -----------------------------------------------------------------------------
// UPDATE AUTHORIZATION POLICY USE CASE
// -----------------------------------------------------------------------------
// Updates an existing Access-owned Authorization Policy.
//
// Boundary:
//   • resolves canonical Authorization Policy state
//   • prevents duplicate active Policy names within the same ownership scope
//   • delegates Policy mutation and versioning to Access business rules
//   • commits state, event and outbox message atomically
//   • does not activate or evaluate the Policy
// -----------------------------------------------------------------------------

import {
    updatePolicy,
} from "../../business-rules";

import {
    AuthorizationPolicyAlreadyExistsError,
    AuthorizationPolicyNotFoundError,
} from "../../errors";

import type {
    AuthorizationPolicyEvaluationRules,
} from "../../state";

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

export interface UpdatePolicyRequest {
    readonly policyId: string;

    readonly name?: string;

    readonly evaluationRules?:
    AuthorizationPolicyEvaluationRules;

    readonly updatedBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class UpdatePolicyUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: UpdatePolicyRequest,
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

        const updatedName =
            request.name ??
            existingPolicy.name;

        const updatedEvaluationRules =
            request.evaluationRules ??
            existingPolicy.evaluationRules;

        if (updatedName !== existingPolicy.name) {
            const existingPolicies =
                await this.dependencies.readStore.listPolicies(
                    existingPolicy.tenantId,
                );

            const policyWithRequestedName =
                existingPolicies.find(
                    (policy) =>
                        policy.policyId !==
                        existingPolicy.policyId &&
                        policy.name ===
                        updatedName &&
                        policy.scope ===
                        existingPolicy.scope &&
                        policy.tenantId ===
                        existingPolicy.tenantId &&
                        policy.lifecycleStatus !==
                        "archived",
                );

            if (policyWithRequestedName !== undefined) {
                throw new AuthorizationPolicyAlreadyExistsError(
                    updatedName,
                    existingPolicy.tenantId,
                );
            }
        }

        const now =
            this.dependencies.clock.now();

        const updatedPolicy =
            updatePolicy({
                policy:
                    existingPolicy,

                name:
                    updatedName,

                evaluationRules:
                    updatedEvaluationRules,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.authorization-policy",

                aggregateId:
                    updatedPolicy.policyId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .authorizationPolicies,

                        documentId:
                            updatedPolicy.policyId,

                        patch: {
                            ...updatedPolicy,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.authorization-policy.updated",

                        aggregateType:
                            "access.authorization-policy",

                        aggregateId:
                            updatedPolicy.policyId,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                updatedPolicy.policyId,

                            name:
                                updatedPolicy.name,

                            scope:
                                updatedPolicy.scope,

                            tenantId:
                                updatedPolicy.tenantId,

                            version:
                                updatedPolicy.version,

                            lifecycleStatus:
                                updatedPolicy.lifecycleStatus,

                            evaluationRules:
                                updatedPolicy.evaluationRules,

                            updatedBy:
                                request.updatedBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.policyUpdated,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                updatedPolicy.policyId,

                            name:
                                updatedPolicy.name,

                            scope:
                                updatedPolicy.scope,

                            tenantId:
                                updatedPolicy.tenantId,

                            version:
                                updatedPolicy.version,

                            lifecycleStatus:
                                updatedPolicy.lifecycleStatus,

                            evaluationRules:
                                updatedPolicy.evaluationRules,

                            updatedBy:
                                request.updatedBy,
                        },
                    },
                ],
            },
        );

        return toAccessPolicyResult(
            updatedPolicy,
        );
    }
}