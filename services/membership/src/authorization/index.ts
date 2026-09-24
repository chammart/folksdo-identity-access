// services/membership/src/authorization/index.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP AUTHORIZATION
// -----------------------------------------------------------------------------
// Public Membership Operations™ authorization contracts and invariants.
//
// Boundary:
//   • Membership owns business Permission requirements
//   • Membership owns Membership and invitation invariants
//   • Access Operations™ owns final authorization decisions
//   • provider-specific authorization composition remains outside Membership
// -----------------------------------------------------------------------------

export * from "./membership-access-authorizer";
export * from "./membership-invariant-guard";
export * from "./membership-permissions";