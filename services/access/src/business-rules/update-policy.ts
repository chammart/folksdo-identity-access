// services/access/src/business-rules/update-policy.ts
// -----------------------------------------------------------------------------
// UPDATE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • update mutable Authorization Policy content
//   • increment Policy version deterministically
//   • prevent archived Policies from being modified
//   • preserve Policy ownership and lifecycle
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical Policy state
//   • performs no persistence or external queries
//   • does not construct replayable events or outbox messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    InvalidAuthorizationPolicyTransitionError,
} from "../errors";

import type {
    AuthorizationPolicyEvaluationRules,
    AuthorizationPolicyState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface UpdatePolicyInput {
    /**
     * Existing canonical Authorization Policy state.
     */
    readonly policy: AuthorizationPolicyState;

    /**
     * Updated Policy name.
     */
    readonly name: string;

    /**
     * Updated deterministic evaluation rules.
     */
    readonly evaluationRules: AuthorizationPolicyEvaluationRules;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// UPDATE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------

export function updatePolicy(
    input: UpdatePolicyInput,
): AuthorizationPolicyState {
    if (input.policy.lifecycleStatus === "archived") {
        throw new InvalidAuthorizationPolicyTransitionError(
            input.policy.lifecycleStatus,
            input.policy.lifecycleStatus,
            input.policy.policyId,
        );
    }

    return {
        ...input.policy,

        name: input.name,

        version: input.policy.version + 1,

        evaluationRules: input.evaluationRules,

        updatedAt: input.now,
    };
}