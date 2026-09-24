// services/access/src/adapters/index.ts
// -----------------------------------------------------------------------------
// ACCESS ADAPTERS
// -----------------------------------------------------------------------------
// Public adapter boundary for Access Operations™.
//
// External provider implementations may depend on:
//   • Access-owned provider contracts
//   • external provider APIs or SDKs
//
// No Access state, business-rule, authorization, use-case, reaction, read-store,
// worker, or API package may import BetterAuth directly.
// -----------------------------------------------------------------------------

export * from "./access-provider";
export * from "./better-auth-access-adapter";