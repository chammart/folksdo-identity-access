// services/access/src/reactions/subscription/index.ts
// -----------------------------------------------------------------------------
// ACCESS SUBSCRIPTION REACTIONS
// -----------------------------------------------------------------------------
// Public reaction boundary for Subscription Operations™ business events
// consumed by Access Operations™.
//
// Subscription Operations™ owns:
//   • Subscription lifecycle
//   • Plan selection
//   • commercial Entitlements
//   • effective commercial capability resolution
//
// Access Operations™ owns:
//   • locally replicated Known Subscription capability facts
//   • capability-aware authorization eligibility
//   • final authorization consequences
// -----------------------------------------------------------------------------

export * from "./on-subscription-commercial-state-changed";