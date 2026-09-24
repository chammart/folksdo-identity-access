// services/access/src/api/index.ts
// -----------------------------------------------------------------------------
// ACCESS API
// -----------------------------------------------------------------------------
// Public transport boundary for Access Operations™.
//
// Boundary:
//   • exposes provider-neutral Access API contracts
//   • exposes DTO mapping contracts
//   • exposes stable HTTP error translation
//   • exposes canonical route definitions
//   • exposes Fastify route registration
//   • preserves application and domain ownership boundaries
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

export * from "./dto";

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

export * from "./validation";

// -----------------------------------------------------------------------------
// PROVIDER-NEUTRAL API
// -----------------------------------------------------------------------------

export * from "./access-api-contracts";
export * from "./access-api";
export * from "./access-api-mappers";
export * from "./access-route-permissions";

// -----------------------------------------------------------------------------
// HTTP TRANSPORT
// -----------------------------------------------------------------------------

export * from "./access-http-errors";
export * from "./access-routes";
export * from "./register-access-routes";