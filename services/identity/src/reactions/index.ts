// services/identity/src/reactions/index.ts
// -----------------------------------------------------------------------------
// IDENTITY REACTIONS
// -----------------------------------------------------------------------------
// Event-driven Identity behaviors.
//
// Purpose:
//   • react to external service events
//   • keep local Identity read models aligned
//   • avoid synchronous service coupling
// -----------------------------------------------------------------------------

export * from "./expire-known-invitation-reaction";
export * from "./identity-reaction-dispatcher";
export * from "./known-invitation-events";
export * from "./mark-known-invitation-redeemed-reaction";
export * from "./record-known-invitation-reaction";
export * from "./revoke-known-invitation-reaction";
