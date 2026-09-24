// services/membership/src/business-rules/redeem-invitation.ts
// -----------------------------------------------------------------------------
// REDEEM INVITATION
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • redeem an available tenant invitation
//   • enforce the Pending → Redeemed invitation transition
//   • reject expired or unavailable invitations
//   • record the Identity that redeemed the invitation
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import {
    InvitationExpiredError,
    InvitationNotAvailableError,
} from "../errors";

import type {
    InvitationState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RedeemInvitationInput {
    readonly invitation: InvitationState;

    readonly identityId: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REDEEM INVITATION
// -----------------------------------------------------------------------------

export function redeemInvitation(
    input: RedeemInvitationInput,
): InvitationState {
    if (input.invitation.status !== "pending") {
        throw new InvitationNotAvailableError(
            input.invitation.invitationId,
        );
    }

    if (
        Date.parse(input.invitation.expiresAt)
        <= Date.parse(input.now)
    ) {
        throw new InvitationExpiredError(
            input.invitation.invitationId,
            input.invitation.expiresAt,
        );
    }

    return {
        ...input.invitation,

        status: "redeemed",

        redeemedByIdentityId: input.identityId,

        redeemedAt: input.now,

        updatedAt: input.now,
    };
}