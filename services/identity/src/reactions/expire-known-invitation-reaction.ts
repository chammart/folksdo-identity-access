// services/identity/src/reactions/expire-known-invitation-reaction.ts
// -----------------------------------------------------------------------------
// EXPIRE KNOWN INVITATION REACTION
// -----------------------------------------------------------------------------
// Reaction to Membership invitation lifecycle event.
//
// Purpose:
//   • keep Identity's local known invitation model aligned
//   • preserve service independence
//   • prevent invalid invitation reuse during signup
// -----------------------------------------------------------------------------

import type { KnownInvitationReadStore } from "../known-invitations";
import type { MembershipInvitationExpiredEvent } from "./known-invitation-events";

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export interface ExpireKnownInvitationReaction {
    handle(event: MembershipInvitationExpiredEvent): Promise<void>;
}

export interface CreateExpireKnownInvitationReactionInput {
    readonly readStore: KnownInvitationReadStore;
}

export function createExpireKnownInvitationReaction(
    input: CreateExpireKnownInvitationReactionInput,
): ExpireKnownInvitationReaction {
    return {
        async handle(event: MembershipInvitationExpiredEvent): Promise<void> {
            await input.readStore.markKnownInvitationStatus({
                invitationId: event.payload.invitationId,
                status: "expired",
                updatedAt: event.occurredAt,
            });
        },
    };
}
