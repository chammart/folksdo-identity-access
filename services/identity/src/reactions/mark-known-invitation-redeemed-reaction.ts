// services/identity/src/reactions/mark-known-invitation-redeemed-reaction.ts
// -----------------------------------------------------------------------------
// MARK KNOWN INVITATION REDEEMED REACTION
// -----------------------------------------------------------------------------
// Reaction to Membership invitation lifecycle event.
//
// Purpose:
//   • keep Identity's local known invitation model aligned
//   • preserve service independence
//   • prevent invalid invitation reuse during signup
// -----------------------------------------------------------------------------

import type { KnownInvitationReadStore } from "../known-invitations";
import type { MembershipInvitationRedeemedEvent } from "./known-invitation-events";

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export interface MarkKnownInvitationRedeemedReaction {
    handle(event: MembershipInvitationRedeemedEvent): Promise<void>;
}

export interface CreateMarkKnownInvitationRedeemedReactionInput {
    readonly readStore: KnownInvitationReadStore;
}

export function createMarkKnownInvitationRedeemedReaction(
    input: CreateMarkKnownInvitationRedeemedReactionInput,
): MarkKnownInvitationRedeemedReaction {
    return {
        async handle(event: MembershipInvitationRedeemedEvent): Promise<void> {
            await input.readStore.markKnownInvitationStatus({
                invitationId: event.payload.invitationId,
                status: "redeemed",
                updatedAt: event.occurredAt,
            });
        },
    };
}
