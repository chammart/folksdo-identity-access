// services/access/src/reactions/membership/index.ts
// -----------------------------------------------------------------------------
// ACCESS MEMBERSHIP REACTIONS
// -----------------------------------------------------------------------------
// Public reaction boundary for Membership Operations™ business events consumed
// by Access Operations™.
//
// Membership Operations™ owns:
//   • tenant participation
//   • Membership lifecycle
//   • active Membership context
//   • Membership validity
//
// Access Operations™ owns:
//   • locally replicated Known Membership facts
//   • Membership-based authorization eligibility
//   • lifecycle consequences for Access-owned assignments
//
// These reactions remain thin translators from Membership-owned business events
// to Access-owned application operations.
// -----------------------------------------------------------------------------

export * from "./on-membership-created";
export * from "./on-membership-activated";
export * from "./on-membership-suspended";
export * from "./on-membership-reactivated";
export * from "./on-membership-archived";