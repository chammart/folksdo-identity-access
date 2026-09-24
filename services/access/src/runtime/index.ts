// services/access/src/runtime/index.ts
// -----------------------------------------------------------------------------
// ACCESS RUNTIME PUBLIC EXPORTS
// -----------------------------------------------------------------------------
// Public runtime surface for Access Operations™.
//
// Purpose:
//   • expose Access runtime configuration and contracts
//   • expose collection and index infrastructure
//   • expose provider-neutral infrastructure factories
//   • expose runtime composition and lifecycle operations
//   • expose the final Access runtime factory and implementation
//
// Boundary:
//   • exports only Access-owned runtime contracts and implementations
//   • contains no runtime construction or lifecycle behavior
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// RUNTIME CONFIGURATION AND CONTRACTS
// -----------------------------------------------------------------------------

export * from "./access-runtime-config";
export * from "./access-runtime-contracts";

// -----------------------------------------------------------------------------
// RUNTIME COLLECTIONS
// -----------------------------------------------------------------------------

export * from "./collections";

// -----------------------------------------------------------------------------
// RUNTIME INDEXES
// -----------------------------------------------------------------------------

export * from "./indexes";

// -----------------------------------------------------------------------------
// RUNTIME INFRASTRUCTURE
// -----------------------------------------------------------------------------

export * from "./infrastructure";

// -----------------------------------------------------------------------------
// RUNTIME COMPOSITION
// -----------------------------------------------------------------------------

export * from "./composition";

// -----------------------------------------------------------------------------
// RUNTIME LIFECYCLE
// -----------------------------------------------------------------------------

export * from "./lifecycle";

// -----------------------------------------------------------------------------
// FINAL RUNTIME
// -----------------------------------------------------------------------------

export * from "./create-access-runtime";
export * from "./access-runtime";

// -----------------------------------------------------------------------------
// SERVICE COMPOSITION
// -----------------------------------------------------------------------------

export * from "./access-service-config";
export * from "./bootstrap-access-service";
