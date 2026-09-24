// services/access/src/usecases/queries/index.ts
// -----------------------------------------------------------------------------
// ACCESS QUERY USE CASES
// -----------------------------------------------------------------------------
// Public query surface for Access Operations™.
//
// Boundary:
//   • exports provider-neutral query use cases
//   • exposes read-only application services
//   • contains no business logic
// -----------------------------------------------------------------------------

export * from "./authorize-action-usecase";
export * from "./current-authorization-usecase";

export * from "./get-permission-usecase";
export * from "./list-permissions-usecase";

export * from "./get-role-usecase";
export * from "./list-roles-usecase";

export * from "./get-policy-usecase";
export * from "./list-policies-usecase";

export * from "./get-restriction-usecase";
export * from "./list-restrictions-usecase";

// Optional future query use cases:
//
// export * from "./list-role-assignments-usecase";
// export * from "./list-permission-assignments-usecase";

export * from "./access-administrative-authorizer";
