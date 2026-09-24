// services/access/src/api/dto/index.ts
// -----------------------------------------------------------------------------
// ACCESS API DTOs
// -----------------------------------------------------------------------------
// Public transport-safe request and response contracts exposed by
// Access Operations™.
//
// DTO rules:
//   • use transport-safe primitive values
//   • serialize dates as ISO 8601 strings
//   • never expose canonical persistence records
//   • never expose Folksdo Engine commit metadata
//   • never accept trusted actor metadata from request bodies
// -----------------------------------------------------------------------------

// Response DTOs
export * from "./permission-dto";
export * from "./role-dto";
export * from "./role-assignment-dto";
export * from "./permission-assignment-dto";
export * from "./authorization-policy-dto";
export * from "./access-restriction-dto";
export * from "./authorization-decision-dto";

// Command request DTOs
export * from "./create-permission-request";
export * from "./create-role-request";
export * from "./update-role-request";
export * from "./archive-role-request";
export * from "./restore-role-request";
export * from "./assign-role-request";
export * from "./remove-role-request";
export * from "./grant-permission-request";
export * from "./revoke-permission-request";
export * from "./create-policy-request";
export * from "./update-policy-request";
export * from "./archive-policy-request";
export * from "./create-restriction-request";
export * from "./remove-restriction-request";
export * from "./authorize-request";

// Query DTOs
export * from "./list-roles-query";
export * from "./list-permissions-query";
export * from "./list-role-assignments-query";
export * from "./list-permission-assignments-query";
export * from "./list-policies-query";
export * from "./list-restrictions-query";