// services/access/src/business-rules/index.ts
// -----------------------------------------------------------------------------
// ACCESS PUBLIC EXPORTS
// -----------------------------------------------------------------------------
// Public exports for this Access Operations™ module.
//
// Boundary:
//   • exports only Access-owned contracts and implementations
//   • preserves Access Operations™ ownership and dependency direction
// -----------------------------------------------------------------------------

export * from "./archive-policy";
export * from "./archive-role";
export * from "./assign-role";
export * from "./create-permission";
export * from "./create-policy";
export * from "./create-restriction";
export * from "./create-role";
export * from "./expire-assignment";
export * from "./expire-restriction";
export * from "./grant-permission";
export * from "./remove-restriction";
export * from "./remove-role";
export * from "./restore-role";
export * from "./revoke-permission";
export * from "./update-policy";
export * from "./update-role";
export * from "./suspend-identity-access";

export * from "./authorization-lifecycle";
