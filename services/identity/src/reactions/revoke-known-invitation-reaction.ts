// services/identity/src/reactions/revoke-known-invitation-reaction.ts
// -----------------------------------------------------------------------------
// REVOKE KNOWN INVITATION REACTION
// -----------------------------------------------------------------------------
// Reaction to Membership invitation lifecycle event.
//
// Purpose:
//   • keep Identity's local known invitation model aligned
//   • preserve service independence
//   • prevent invalid invitation reuse during signup
// -----------------------------------------------------------------------------

import type { KnownInvitationReadStore } from "../known-invitations";
import type { MembershipInvitationRevokedEvent } from "./known-invitation-events";

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export interface RevokeKnownInvitationReaction {
    handle(event: MembershipInvitationRevokedEvent): Promise<void>;
}

export interface CreateRevokeKnownInvitationReactionInput {
    readonly readStore: KnownInvitationReadStore;
}

export function createRevokeKnownInvitationReaction(
    input: CreateRevokeKnownInvitationReactionInput,
): RevokeKnownInvitationReaction {
    return {
        async handle(event: MembershipInvitationRevokedEvent): Promise<void> {
            await input.readStore.markKnownInvitationStatus({
                invitationId: event.payload.invitationId,
                status: "revoked",
                updatedAt: event.occurredAt,
            });
        },
    };
}
