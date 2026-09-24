// services/access/src/reactions/tenant/index.ts
// -----------------------------------------------------------------------------
// ACCESS TENANT REACTIONS
// -----------------------------------------------------------------------------
// Public reaction boundary for Tenant Operations™ business events consumed by
// Access Operations™.
//
// Tenant Operations™ owns:
//   • Tenant lifecycle
//   • Tenant activation, suspension, restoration and archival
//   • Tenant business identity and configuration
//
// Access Operations™ owns:
//   • locally replicated Known Tenant facts
//   • Tenant-based authorization eligibility
//   • lifecycle consequences for Access-owned authorization state
//
// These reactions remain thin translators from Tenant-owned business events
// to Access-owned application operations.
// -----------------------------------------------------------------------------

export * from "./on-tenant-created";
export * from "./on-tenant-activated";
export * from "./on-tenant-suspended";
export * from "./on-tenant-reactivated";
export * from "./on-tenant-archived";