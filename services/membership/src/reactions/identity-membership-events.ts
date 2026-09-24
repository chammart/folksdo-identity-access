// services/membership/src/reactions/identity-membership-events.ts
// -----------------------------------------------------------------------------
// IDENTITY MEMBERSHIP EVENTS
// -----------------------------------------------------------------------------
// External Identity Operations™ event contracts consumed by Membership
// Operations™.
//
// Purpose:
//   • define the Identity event payloads understood by Membership
//   • preserve the published Identity event terminology at the boundary
//   • provide strongly typed reaction inputs
//   • keep external event contracts separate from Membership state
//
// Boundary:
//   • these contracts describe events owned and published by Identity
//   • Membership must not treat these payloads as canonical Membership state
//   • reactions translate Identity terminology into Membership terminology
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// INVITATION REDEMPTION REQUESTED
// -----------------------------------------------------------------------------

export interface IdentityInvitationRedemptionRequestedPayload {
    /**
     * Membership invitation being redeemed.
     */
    readonly invitationId: string;

    /**
     * Identity Operations™ identifier for the activated or created user.
     *
     * Membership reactions translate this value to identityId internally.
     */
    readonly userId: string;

    /**
     * Verified or supplied Identity email used to validate the invitation.
     */
    readonly email: string;
}

export interface IdentityInvitationRedemptionRequestedEvent {
    readonly eventType:
    "identity.invitation_redemption.requested";

    readonly payload:
    IdentityInvitationRedemptionRequestedPayload;
}

// -----------------------------------------------------------------------------
// USER ACTIVATED
// -----------------------------------------------------------------------------

export interface IdentityUserActivatedPayload {
    /**
     * Activated global Identity identifier.
     *
     * Membership reactions translate this value to identityId internally.
     */
    readonly userId: string;
}

export interface IdentityUserActivatedEvent {
    readonly eventType:
    "identity.user.activated";

    readonly payload:
    IdentityUserActivatedPayload;
}

// -----------------------------------------------------------------------------
// CONSUMED IDENTITY EVENT UNION
// -----------------------------------------------------------------------------

export type IdentityMembershipEvent =
    | IdentityInvitationRedemptionRequestedEvent
    | IdentityUserActivatedEvent;