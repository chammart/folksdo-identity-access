// services/membership/src/reactions/membership-reaction-subjects.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP REACTION SUBJECTS
// -----------------------------------------------------------------------------
// Canonical inbound subjects registered by Membership Operations™.
// -----------------------------------------------------------------------------

export const membershipReactionSubjects = [
    "identity.invitation_redemption.requested",
    "identity.user.activated",
    "identity.identity.archived",
    "tenant.suspended",
    "tenant.archived",
    "subscription.suspended",
    "subscription.reactivated",
] as const;

export type MembershipReactionSubject =
    (typeof membershipReactionSubjects)[number];
