// services/access/src/reactions/index.ts
// -----------------------------------------------------------------------------
// ACCESS REACTIONS
// -----------------------------------------------------------------------------
// Public reaction boundary for Access Operations™.
//
// Reactions consume replayable business events emitted by other services and
// translate them into Access-owned application operations.
// -----------------------------------------------------------------------------

export * from "./access-reaction-contracts";
export * from "./access-reaction-results";
export * from "./reaction-support";

export * from "./identity";
export * from "./membership";
export * from "./tenant";
export * from "./subscription";