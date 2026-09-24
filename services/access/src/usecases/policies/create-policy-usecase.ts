// services/access/src/usecases/policies/create-policy-usecase.ts
// -----------------------------------------------------------------------------
// CREATE AUTHORIZATION POLICY USE CASE
// -----------------------------------------------------------------------------
// Creates an Access-owned Authorization Policy.
//
// Boundary:
//   • validates Policy uniqueness through the Access read model
//   • delegates ownership and lifecycle initialization to business rules
//   • commits canonical state, event and outbox message atomically
//   • does not evaluate or activate the Policy
//   • does not mutate existing authorization decisions
// -----------------------------------------------------------------------------

import {
    createPolicy,
} from "../../business-rules";

import {
    AuthorizationPolicyAlreadyExistsError,
} from "../../errors";

import type {
    AuthorizationPolicyEvaluationRules,
    AuthorizationPolicyScope,
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

export interface CreatePolicyRequest {
    readonly name: string;

    readonly scope: AuthorizationPolicyScope;

    readonly tenantId?: string;

    readonly evaluationRules:
    AuthorizationPolicyEvaluationRules;

    readonly createdBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class CreatePolicyUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: CreatePolicyRequest,
    ): Promise<AccessPolicyResult> {
        const existingPolicies =
            await this.dependencies.readStore.listPolicies(
                request.tenantId,
            );

        const existingPolicy =
            existingPolicies.find(
                (policy) =>
                    policy.name === request.name &&
                    policy.scope === request.scope &&
                    policy.tenantId === request.tenantId &&
                    policy.lifecycleStatus !== "archived",
            );

        if (existingPolicy !== undefined) {
            throw new AuthorizationPolicyAlreadyExistsError(
                request.name,
                request.tenantId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const policy =
            createPolicy({
                policyId:
                    this.dependencies.ids.policyId(),

                name:
                    request.name,

                scope:
                    request.scope,

                tenantId:
                    request.tenantId,

                evaluationRules:
                    request.evaluationRules,

                createdBy:
                    request.createdBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.authorization-policy",

                aggregateId:
                    policy.policyId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections
                                .authorizationPolicies,

                        document: {
                            ...policy,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.authorization-policy.created",

                        aggregateType:
                            "access.authorization-policy",

                        aggregateId:
                            policy.policyId,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                policy.policyId,

                            name:
                                policy.name,

                            scope:
                                policy.scope,

                            tenantId:
                                policy.tenantId,

                            version:
                                policy.version,

                            lifecycleStatus:
                                policy.lifecycleStatus,

                            evaluationRules:
                                policy.evaluationRules,

                            createdBy:
                                policy.createdBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.policyCreated,

                        occurredAt:
                            now,

                        payload: {
                            policyId:
                                policy.policyId,

                            name:
                                policy.name,

                            scope:
                                policy.scope,

                            tenantId:
                                policy.tenantId,

                            version:
                                policy.version,

                            lifecycleStatus:
                                policy.lifecycleStatus,

                            evaluationRules:
                                policy.evaluationRules,

                            createdBy:
                                policy.createdBy,
                        },
                    },
                ],
            },
        );

        return toAccessPolicyResult(
            policy,
        );
    }
}