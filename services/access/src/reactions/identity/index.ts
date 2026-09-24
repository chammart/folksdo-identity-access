// services/access/src/reactions/identity/index.ts
// -----------------------------------------------------------------------------
// ACCESS IDENTITY REACTIONS
// -----------------------------------------------------------------------------
// Public reaction boundary for Identity Operations™ business events consumed
// by Access Operations™.
//
// Identity Operations™ owns:
//   • global Identity lifecycle
//   • credentials and authentication
//   • Identity activation, disablement, restoration and archival
//
// Access Operations™ owns:
//   • locally replicated Known Identity facts
//   • authorization eligibility
//   • suspension, restoration and archival of Access-owned authorization state
//
// These reactions remain thin translators from Identity-owned business events
// to Access-owned application operations.
// -----------------------------------------------------------------------------

export * from "./on-user-created";
export * from "./on-user-activated";
export * from "./on-user-disabled";
export * from "./on-user-restored";
export * from "./on-user-archived";