// services/membership/src/business-rules/suspend-membership.ts
// -----------------------------------------------------------------------------
// SUSPEND MEMBERSHIP
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • suspend an active Membership
//   • enforce the valid Active → Suspended lifecycle transition
//   • preserve the business reason for suspension
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidMembershipTransitionError } from "../errors";

import type {
    MembershipState,
    MembershipSuspensionSource,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface SuspendMembershipInput {
    readonly membership: MembershipState;

    /**
     * Business-safe reason for suspending participation.
     */
    readonly reason: string;

    /**
     * Lifecycle source responsible for the suspension.
     */
    readonly source?: MembershipSuspensionSource;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// SUSPEND MEMBERSHIP
// -----------------------------------------------------------------------------

export function suspendMembership(
    input: SuspendMembershipInput,
): MembershipState {
    if (input.membership.status !== "active") {
        throw new InvalidMembershipTransitionError(
            input.membership.status,
            "suspended",
            input.membership.membershipId,
        );
    }

    return {
        ...input.membership,

        status: "suspended",

        suspendedAt: input.now,

        suspensionReason: input.reason,

        suspensionSource: input.source ?? "manual",

        updatedAt: input.now,
    };
}