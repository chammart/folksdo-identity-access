// services/access/src/business-rules/remove-restriction.ts
// -----------------------------------------------------------------------------
// REMOVE ACCESS RESTRICTION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • remove an active authorization Restriction
//   • enforce Restriction removal eligibility
//   • preserve historical Restriction state
//   • prevent removed Restrictions from participating in authorization
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical Restriction state
//   • performs no persistence or external queries
//   • does not construct replayable events or outbox messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    AuthorizationContextInvalidError,
} from "../errors";

import type {
    AccessRestrictionState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RemoveRestrictionInput {
    /**
     * Existing canonical Access Restriction state.
     */
    readonly restriction: AccessRestrictionState;

    /**
     * Actor responsible for removing the Restriction.
     */
    readonly removedBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REMOVE ACCESS RESTRICTION
// -----------------------------------------------------------------------------

export function removeRestriction(
    input: RemoveRestrictionInput,
): AccessRestrictionState {
    if (input.restriction.status !== "active") {
        throw new AuthorizationContextInvalidError(
            "Only active Access Restrictions may be removed.",
        );
    }

    return {
        ...input.restriction,

        status: "removed",

        removedAt: input.now,

        removedBy: input.removedBy,

        updatedAt: input.now,
    };
}