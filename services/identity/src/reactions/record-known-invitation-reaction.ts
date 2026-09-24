// services/identity/src/reactions/record-known-invitation-reaction.ts
// -----------------------------------------------------------------------------
// RECORD KNOWN INVITATION REACTION
// -----------------------------------------------------------------------------
// Reaction to Membership invitation creation.
//
// Purpose:
//   • receive invitation facts emitted by Membership
//   • store a local Identity verification copy
//   • allow Invitation SignUp™ to verify tokens without calling Membership
// -----------------------------------------------------------------------------

import type { KnownInvitationReadStore } from "../known-invitations";
import type { MembershipInvitationCreatedEvent } from "./known-invitation-events";

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export interface RecordKnownInvitationReaction {
    handle(event: MembershipInvitationCreatedEvent): Promise<void>;
}

export interface CreateRecordKnownInvitationReactionInput {
    readonly readStore: KnownInvitationReadStore;
}

export function createRecordKnownInvitationReaction(
    input: CreateRecordKnownInvitationReactionInput,
): RecordKnownInvitationReaction {
    return {
        async handle(event: MembershipInvitationCreatedEvent): Promise<void> {
            await input.readStore.upsertKnownInvitation({
                invitationId: event.payload.invitationId,
                targetTenantId: event.payload.targetTenantId,
                invitedEmail: event.payload.invitedEmail.trim().toLowerCase(),
                invitationTokenHash: event.payload.invitationTokenHash,
                status: "pending",
                expiresAt: event.payload.expiresAt,
                createdAt: event.occurredAt,
                updatedAt: event.occurredAt,
            });
        },
    };
}
