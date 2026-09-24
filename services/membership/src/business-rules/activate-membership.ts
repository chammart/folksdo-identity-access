// services/membership/src/business-rules/activate-membership.ts
// -----------------------------------------------------------------------------
// ACTIVATE MEMBERSHIP
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • activate a pending Membership
//   • enforce the valid Pending → Active lifecycle transition
//   • initialize Membership-owned activation timestamps
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidMembershipTransitionError } from "../errors";

import type {
    MembershipState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ActivateMembershipInput {
    readonly membership: MembershipState;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ACTIVATE MEMBERSHIP
// -----------------------------------------------------------------------------

export function activateMembership(
    input: ActivateMembershipInput,
): MembershipState {
    if (input.membership.status !== "pending") {
        throw new InvalidMembershipTransitionError(
            input.membership.status,
            "active",
            input.membership.membershipId,
        );
    }

    return {
        ...input.membership,

        status: "active",

        activatedAt: input.now,

        updatedAt: input.now,
    };
}