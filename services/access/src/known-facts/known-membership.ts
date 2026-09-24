// services/access/src/known-facts/known-membership.ts
// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP
// -----------------------------------------------------------------------------
// Access-owned local facts about tenant participation.
//
// Purpose:
//   • retain only Membership facts required for authorization
//   • establish the Membership as the tenant authorization subject
//   • prevent synchronous Membership Operations™ calls during authorization
//   • support deterministic Membership lifecycle reactions
//   • preserve suspension provenance for safe automatic restoration
//
// Boundary:
//   • Membership Operations™ owns canonical tenant participation
//   • Access Operations™ owns roles, permissions, and authorization
//   • this model does not resolve or select Membership Context
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP TYPE
// -----------------------------------------------------------------------------

export const knownMembershipTypes = [
    "member",
    "guest",
    "service",
    "provider_operator",
] as const;

export type KnownMembershipType =
    (typeof knownMembershipTypes)[number];

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP STATUS
// -----------------------------------------------------------------------------

export const knownMembershipStatuses = [
    "pending",
    "active",
    "suspended",
    "archived",
] as const;

export type KnownMembershipStatus =
    (typeof knownMembershipStatuses)[number];

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP SUSPENSION SOURCE
// -----------------------------------------------------------------------------

export const knownMembershipSuspensionSources = [
    "manual",
    "tenant",
    "subscription",
    "identity",
    "security_policy",
] as const;

export type KnownMembershipSuspensionSource =
    (typeof knownMembershipSuspensionSources)[number];

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP
// -----------------------------------------------------------------------------

export interface KnownMembership {
    /**
     * Stable Membership Operations™ identifier.
     *
     * Tenant authorization is evaluated through this subject.
     */
    readonly membershipId: string;

    /**
     * Global Identity participating through the Membership.
     */
    readonly identityId: string;

    /**
     * Tenant in which authorization may be evaluated.
     */
    readonly tenantId: string;

    /**
     * Form of tenant participation.
     *
     * Membership type is not an Access Role and does not grant permissions.
     */
    readonly membershipType: KnownMembershipType;

    /**
     * Current Membership lifecycle fact known by Access Operations™.
     */
    readonly status: KnownMembershipStatus;

    /**
     * Timestamp when the Membership became active.
     */
    readonly activatedAt?: string;

    /**
     * Timestamp when the Membership was suspended.
     */
    readonly suspendedAt?: string;

    /**
     * Business lifecycle that caused the current suspension.
     *
     * Suspension provenance is required for safe automatic restoration.
     */
    readonly suspensionSource?: KnownMembershipSuspensionSource;

    /**
     * Timestamp when the suspended Membership was restored.
     */
    readonly reactivatedAt?: string;

    /**
     * Timestamp when the Membership was archived.
     */
    readonly archivedAt?: string;

    /**
     * Timestamp when Access last updated this local fact.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP GUARDS
// -----------------------------------------------------------------------------

export function isKnownMembershipType(
    value: unknown,
): value is KnownMembershipType {
    return (
        typeof value === "string"
        && knownMembershipTypes.includes(
            value as KnownMembershipType,
        )
    );
}

export function isKnownMembershipStatus(
    value: unknown,
): value is KnownMembershipStatus {
    return (
        typeof value === "string"
        && knownMembershipStatuses.includes(
            value as KnownMembershipStatus,
        )
    );
}

export function isKnownMembershipSuspensionSource(
    value: unknown,
): value is KnownMembershipSuspensionSource {
    return (
        typeof value === "string"
        && knownMembershipSuspensionSources.includes(
            value as KnownMembershipSuspensionSource,
        )
    );
}

export function isKnownMembershipPending(
    membership: KnownMembership,
): boolean {
    return membership.status === "pending";
}

export function isKnownMembershipActive(
    membership: KnownMembership,
): boolean {
    return membership.status === "active";
}

export function isKnownMembershipSuspended(
    membership: KnownMembership,
): boolean {
    return membership.status === "suspended";
}

export function isKnownMembershipArchived(
    membership: KnownMembership,
): boolean {
    return membership.status === "archived";
}

// -----------------------------------------------------------------------------
// AUTHORIZATION ELIGIBILITY
// -----------------------------------------------------------------------------

export function isKnownMembershipEligibleForAccess(
    membership: KnownMembership,
): boolean {
    return isKnownMembershipActive(membership);
}