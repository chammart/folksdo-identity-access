// services/identity/src/known-invitations/known-invitation-read-store.ts
// -----------------------------------------------------------------------------
// KNOWN INVITATION READ STORE
// -----------------------------------------------------------------------------
// Read/write abstraction for Identity's local known invitation model.
//
// Purpose:
//   • support local invitation verification during signup
//   • support Identity reactions to Membership invitation events
//   • avoid synchronous coupling from Identity to Membership
// -----------------------------------------------------------------------------

import type {
    KnownInvitationState,
    KnownInvitationStatus,
} from "./known-invitation-state";

export interface KnownInvitationReadStore {
    findByTokenHash(
        invitationTokenHash: string,
    ): Promise<KnownInvitationState | null>;

    upsertKnownInvitation(
        invitation: KnownInvitationState,
    ): Promise<void>;

    markKnownInvitationStatus(input: {
        readonly invitationId: string;

        readonly status: KnownInvitationStatus;

        readonly updatedAt: string;
    }): Promise<void>;
}
