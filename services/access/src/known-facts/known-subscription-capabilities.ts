// services/access/src/known-facts/known-subscription-capabilities.ts
// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION CAPABILITIES
// -----------------------------------------------------------------------------
// Access-owned local commercial capability facts.
//
// Purpose:
//   • retain only Subscription facts required for authorization
//   • prevent synchronous Subscription Operations™ calls during authorization
//   • constrain authorization to commercially available capabilities
//   • preserve the boundary between Entitlement and authorization
//
// Boundary:
//   • Subscription Operations™ owns Subscription lifecycle and Entitlements
//   • business capabilities define the commercial capabilities they require
//   • Access Operations™ applies known commercial capability constraints
//   • Subscription Operations™ does not produce authorization decisions
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION STATUS
// -----------------------------------------------------------------------------

export const knownSubscriptionStatuses = [
    "pending",
    "active",
    "suspended",
    "cancelled",
    "expired",
] as const;

export type KnownSubscriptionStatus =
    (typeof knownSubscriptionStatuses)[number];

// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION CAPABILITIES
// -----------------------------------------------------------------------------

export interface KnownSubscriptionCapabilities {
    readonly tenantId: string;

    readonly subscriptionId: string;

    readonly status: KnownSubscriptionStatus;

    /**
     * Commercial capability keys currently acquired by the Tenant.
     *
     * These are Subscription-owned business keys, not Access Permission IDs.
     */
    readonly capabilities: readonly string[];

    readonly effectiveAt: string;

    readonly expiresAt?: string;

    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION GUARDS
// -----------------------------------------------------------------------------

export function isKnownSubscriptionStatus(
    value: unknown,
): value is KnownSubscriptionStatus {
    return (
        typeof value === "string"
        && knownSubscriptionStatuses.includes(
            value as KnownSubscriptionStatus,
        )
    );
}

export function isKnownSubscriptionActive(
    subscription: KnownSubscriptionCapabilities,
): boolean {
    return subscription.status === "active";
}

export function hasKnownSubscriptionCapability(
    subscription: KnownSubscriptionCapabilities,
    capability: string,
): boolean {
    return subscription.capabilities.includes(
        capability,
    );
}

// -----------------------------------------------------------------------------
// AUTHORIZATION ELIGIBILITY
// -----------------------------------------------------------------------------

export function isKnownSubscriptionEligibleForAccess(
    subscription: KnownSubscriptionCapabilities,
): boolean {
    return isKnownSubscriptionActive(
        subscription,
    );
}