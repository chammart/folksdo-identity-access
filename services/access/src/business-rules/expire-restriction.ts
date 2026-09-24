// services/access/src/business-rules/expire-restriction.ts
// -----------------------------------------------------------------------------
// EXPIRE ACCESS RESTRICTION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • expire a time-bound authorization Restriction
//   • enforce Restriction expiration eligibility
//   • preserve historical Restriction state
//   • prevent expired Restrictions from participating in authorization
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

export interface ExpireRestrictionInput {
    /**
     * Existing canonical Access Restriction state.
     */
    readonly restriction: AccessRestrictionState;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// EXPIRE ACCESS RESTRICTION
// -----------------------------------------------------------------------------

export function expireRestriction(
    input: ExpireRestrictionInput,
): AccessRestrictionState {
    if (input.restriction.status !== "active") {
        throw new AuthorizationContextInvalidError(
            "Only active Access Restrictions may expire.",
        );
    }

    if (!input.restriction.expiresAt) {
        throw new AuthorizationContextInvalidError(
            "Access Restriction does not define an expiration timestamp.",
        );
    }

    if (input.restriction.expiresAt > input.now) {
        throw new AuthorizationContextInvalidError(
            "Access Restriction is not yet eligible for expiration.",
        );
    }

    return {
        ...input.restriction,

        status: "expired",

        expiredAt: input.now,

        updatedAt: input.now,
    };
}