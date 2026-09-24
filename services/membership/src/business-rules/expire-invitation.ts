// services/membership/src/business-rules/expire-invitation.ts
// -----------------------------------------------------------------------------
// EXPIRE INVITATION
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • mark an elapsed tenant invitation as expired
//   • enforce the Pending → Expired invitation transition
//   • prevent an invitation from expiring before its deadline
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import {
    InvitationNotAvailableError,
    MembershipNotEligibleError,
} from "../errors";

import type {
    InvitationState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ExpireInvitationInput {
    readonly invitation: InvitationState;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// EXPIRE INVITATION
// -----------------------------------------------------------------------------

export function expireInvitation(
    input: ExpireInvitationInput,
): InvitationState {
    if (input.invitation.status !== "pending") {
        throw new InvitationNotAvailableError(
            input.invitation.invitationId,
        );
    }

    if (
        Date.parse(input.invitation.expiresAt)
        > Date.parse(input.now)
    ) {
        throw new MembershipNotEligibleError(
            undefined,
            "Invitation has not reached its expiration time.",
        );
    }

    return {
        ...input.invitation,

        status: "expired",

        expiredAt: input.now,

        updatedAt: input.now,
    };
}