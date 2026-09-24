// services/access/src/runtime/lifecycle/index.ts
// -----------------------------------------------------------------------------
// ACCESS RUNTIME LIFECYCLE
// -----------------------------------------------------------------------------
// Public lifecycle surface for Access Operations™.
//
// Boundary:
//   • exports startup, graceful shutdown and readiness validation
//   • preserves provider-neutral runtime ownership
//   • does not expose infrastructure-provider implementations
// -----------------------------------------------------------------------------

export * from "./start-access-runtime";
export * from "./stop-access-runtime";
export * from "./validate-access-readiness";
