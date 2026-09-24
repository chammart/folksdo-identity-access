// services/membership/src/business-rules/reactivate-membership.ts
// -----------------------------------------------------------------------------
// REACTIVATE MEMBERSHIP
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • restore a suspended Membership
//   • enforce the valid Suspended → Active lifecycle transition
//   • preserve the original activation history
//   • clear the active suspension state
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidMembershipTransitionError } from "../errors";

import type {
    MembershipState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ReactivateMembershipInput {
    readonly membership: MembershipState;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REACTIVATE MEMBERSHIP
// -----------------------------------------------------------------------------

export function reactivateMembership(
    input: ReactivateMembershipInput,
): MembershipState {
    if (input.membership.status !== "suspended") {
        throw new InvalidMembershipTransitionError(
            input.membership.status,
            "active",
            input.membership.membershipId,
        );
    }

    return {
        ...input.membership,

        status: "active",

        reactivatedAt: input.now,

        suspensionReason: undefined,

        suspensionSource: undefined,

        updatedAt: input.now,
    };
}