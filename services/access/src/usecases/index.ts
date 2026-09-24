// services/access/src/usecases/index.ts
// -----------------------------------------------------------------------------
// ACCESS USE CASES
// -----------------------------------------------------------------------------
// Public application surface for Access Operations™.
//
// Boundary:
//   • exposes Access command use cases
//   • exposes Access query use cases
//   • exposes provider-neutral contracts and result models
//   • preserves Access Operations™ ownership boundaries
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SHARED
// -----------------------------------------------------------------------------

export * from "./shared";

// -----------------------------------------------------------------------------
// COMMANDS
// -----------------------------------------------------------------------------

export * from "./roles";
export * from "./permissions";
export * from "./policies";
export * from "./restrictions";

export * from "./authorization-lifecycle";
export * from "./expirations";

// -----------------------------------------------------------------------------
// QUERIES
// -----------------------------------------------------------------------------

export * from "./queries";