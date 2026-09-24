// services/membership/src/runtime/membership-service-config.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP SERVICE CONFIG
// -----------------------------------------------------------------------------
// Membership Operations™ runtime configuration.
//
// Purpose:
//   • define Membership-owned runtime configuration
//   • keep configuration explicit and strongly typed
//   • isolate service configuration from host implementation details
//
// Boundary:
//   • contains only Membership-owned configuration
//   • contains no runtime composition
//   • contains no business logic
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SERVICE CONFIGURATION
// -----------------------------------------------------------------------------

export interface MembershipServiceConfig {
    /**
     * Default lifetime applied to newly issued invitations when the
     * request does not specify an explicit expiration.
     */
    readonly invitationTtlMilliseconds: number;

    /** Scheduled invitation expiration interval. Zero disables scheduling. */
    readonly invitationExpirationIntervalMilliseconds?: number;

    /** Maximum invitations processed by one scheduled run. */
    readonly invitationExpirationBatchSize?: number;
}