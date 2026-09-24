// services/access/src/business-rules/archive-policy.ts
// -----------------------------------------------------------------------------
// ARCHIVE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • archive an existing Authorization Policy
//   • enforce a valid Draft or Active → Archived transition
//   • prevent archived Policies from participating in authorization
//   • preserve Policy history and version
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not emit events or publish messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    InvalidAuthorizationPolicyTransitionError,
} from "../errors";

import type {
    AuthorizationPolicyState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ArchivePolicyInput {
    /**
     * Existing canonical Authorization Policy state.
     */
    readonly policy: AuthorizationPolicyState;

    /**
     * Actor responsible for archiving the Authorization Policy.
     */
    readonly archivedBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ARCHIVE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------

export function archivePolicy(
    input: ArchivePolicyInput,
): AuthorizationPolicyState {
    if (input.policy.lifecycleStatus === "archived") {
        throw new InvalidAuthorizationPolicyTransitionError(
            input.policy.lifecycleStatus,
            "archived",
            input.policy.policyId,
        );
    }

    return {
        ...input.policy,

        lifecycleStatus: "archived",

        archivedAt: input.now,

        archivedBy: input.archivedBy,

        updatedAt: input.now,
    };
}