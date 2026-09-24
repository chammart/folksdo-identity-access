// services/identity/src/known-invitations/known-invitation-state.ts
// -----------------------------------------------------------------------------
// KNOWN INVITATION STATE
// -----------------------------------------------------------------------------
// Local Identity-owned read model of Membership invitation facts.
//
// Purpose:
//   • allow Identity to verify invitation signup without calling Membership
//   • keep Identity and Membership independently deployable
//   • preserve event-choreography between services
//
// Important:
//
// Identity does not own the invitation lifecycle.
//
// Membership owns:
//   • invitation issuance
//   • invitation expiration
//   • invitation revocation
//   • invitation redemption
//
// Identity stores only the local facts required to verify signup.
// -----------------------------------------------------------------------------

export type KnownInvitationStatus =
    | "pending"
    | "expired"
    | "revoked"
    | "redeemed";

export interface KnownInvitationState {
    readonly invitationId: string;

    readonly targetTenantId: string;

    readonly invitedEmail: string;

    readonly invitationTokenHash: string;

    readonly status: KnownInvitationStatus;

    readonly expiresAt: string;

    readonly createdAt: string;

    readonly updatedAt: string;
}
