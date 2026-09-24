// services/identity/src/reactions/known-invitation-events.ts
// -----------------------------------------------------------------------------
// KNOWN INVITATION EVENTS
// -----------------------------------------------------------------------------
// Event contracts consumed by Identity from Membership Service™.
//
// Purpose:
//   • define the Membership invitation facts Identity can react to
//   • keep reaction inputs explicit and business-oriented
//   • avoid synchronous service coupling
//
// These are external event shapes from Identity's point of view.
// Membership remains the owner of the invitation lifecycle.
// -----------------------------------------------------------------------------

export interface MembershipInvitationCreatedEvent {
    readonly eventType: "membership.invitation.created";

    readonly occurredAt: string;

    readonly payload: {
        readonly invitationId: string;

        readonly targetTenantId: string;

        readonly invitedEmail: string;

        readonly invitationTokenHash: string;

        readonly expiresAt: string;
    };
}

export interface MembershipInvitationExpiredEvent {
    readonly eventType: "membership.invitation.expired";

    readonly occurredAt: string;

    readonly payload: {
        readonly invitationId: string;
    };
}

export interface MembershipInvitationRevokedEvent {
    readonly eventType: "membership.invitation.revoked";

    readonly occurredAt: string;

    readonly payload: {
        readonly invitationId: string;
    };
}

export interface MembershipInvitationRedeemedEvent {
    readonly eventType: "membership.invitation.redeemed";

    readonly occurredAt: string;

    readonly payload: {
        readonly invitationId: string;
    };
}
