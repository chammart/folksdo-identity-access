// services/membership/src/business-rules/index.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP BUSINESS RULES
// -----------------------------------------------------------------------------
// Public exports for pure Membership-owned domain rules.
//
// Boundary:
//   • business rules contain no persistence
//   • business rules contain no event publication
//   • business rules contain no HTTP concerns
//   • use cases orchestrate these rules through Folksdo Engine™
// -----------------------------------------------------------------------------

export * from "./activate-membership";
export * from "./archive-membership";
export * from "./create-membership";
export * from "./expire-invitation";
export * from "./hash-invitation-token";
export * from "./normalize-invitation-email";
export * from "./reactivate-membership";
export * from "./redeem-invitation";
export * from "./revoke-invitation";
export * from "./suspend-membership";