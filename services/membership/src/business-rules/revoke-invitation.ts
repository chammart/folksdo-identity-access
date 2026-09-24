// services/membership/src/business-rules/revoke-invitation.ts
// -----------------------------------------------------------------------------
// REVOKE INVITATION
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • revoke an available tenant invitation
//   • enforce the Pending → Revoked invitation transition
//   • prevent redeemed, expired, or already revoked invitations from changing
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import {
    InvitationNotAvailableError,
} from "../errors";

import type {
    InvitationState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RevokeInvitationInput {
    readonly invitation: InvitationState;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REVOKE INVITATION
// -----------------------------------------------------------------------------

export function revokeInvitation(
    input: RevokeInvitationInput,
): InvitationState {
    if (input.invitation.status !== "pending") {
        throw new InvitationNotAvailableError(
            input.invitation.invitationId,
        );
    }

    return {
        ...input.invitation,

        status: "revoked",

        revokedAt: input.now,

        updatedAt: input.now,
    };
}