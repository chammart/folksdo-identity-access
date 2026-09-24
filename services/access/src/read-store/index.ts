// services/access/src/read-store/index.ts
// -----------------------------------------------------------------------------
// ACCESS READ STORE
// -----------------------------------------------------------------------------
// Public persistence-query surface for Access Operations™.
//
// Boundary:
//   • exports the provider-neutral Access read-store contract
//   • exports the MongoDB implementation and collection configuration
//   • preserves provider details behind the read-store implementation
// -----------------------------------------------------------------------------

export * from "./access-read-store";
export * from "./mongo-access-read-store";