// services/membership/src/state/membership.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP STATE
// -----------------------------------------------------------------------------
// Canonical Membership-owned state for tenant participation.
//
// Purpose:
//   • represent the relationship between a global Identity and a tenant
//   • preserve Membership-owned lifecycle state
//   • distinguish standard participation from guest participation
//   • support deterministic tenant-context resolution
//   • remain independent from Access-owned roles and permissions
//
// Boundary:
//   • Identity Operations™ owns the global identity
//   • Tenant Operations™ owns the tenant lifecycle
//   • Membership Operations™ owns tenant participation
//   • Access Operations™ owns roles, permissions, and authorization
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MEMBERSHIP TYPE
// -----------------------------------------------------------------------------

export const membershipTypes = [
    "member",
    "guest",
    "service",
    "provider_operator",
] as const;

export type MembershipType =
    (typeof membershipTypes)[number];

// -----------------------------------------------------------------------------
// MEMBERSHIP STATUS
// -----------------------------------------------------------------------------

export const membershipStatuses = [
    "pending",
    "active",
    "suspended",
    "archived",
] as const;

export type MembershipStatus =
    (typeof membershipStatuses)[number];

export const membershipSuspensionSources = [
    "manual",
    "tenant",
    "subscription",
    "identity",
    "security_policy",
] as const;

export type MembershipSuspensionSource =
    (typeof membershipSuspensionSources)[number];

// -----------------------------------------------------------------------------
// MEMBERSHIP STATE
// -----------------------------------------------------------------------------

export interface MembershipState {
    /**
     * Stable Membership-owned aggregate identifier.
     */
    readonly membershipId: string;

    /**
     * Global Identity participating in the tenant.
     */
    readonly identityId: string;

    /**
     * Tenant in which the Identity participates.
     */
    readonly tenantId: string;

    /**
     * Participation type.
     *
     * Guest participation is represented as a Membership type rather than
     * through a separate aggregate.
     */
    readonly membershipType: MembershipType;

    /**
     * Current Membership lifecycle state.
     */
    readonly status: MembershipStatus;

    /**
     * Invitation that originated the Membership.
     *
     * Present only when participation was created through an invitation.
     */
    readonly sourceInvitationId?: string;

    /**
     * Timestamp when the Membership became active.
     */
    readonly activatedAt?: string;

    /**
     * Timestamp when the Membership was suspended.
     */
    readonly suspendedAt?: string;

    /**
     * Business-safe reason for suspension.
     */
    readonly suspensionReason?: string;

    /**
     * Business lifecycle that caused the current suspension.
     *
     * This source is required for safe automatic restoration. A Subscription
     * restoration may only reactivate Memberships suspended by Subscription.
     */
    readonly suspensionSource?: MembershipSuspensionSource;

    /**
     * Timestamp when a suspended Membership was restored.
     */
    readonly reactivatedAt?: string;

    /**
     * Timestamp when the Membership was archived.
     */
    readonly archivedAt?: string;

    /**
     * Business-safe reason for archival.
     */
    readonly archiveReason?: string;

    /**
     * Timestamp when the Membership was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Membership was last changed.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP STATE GUARDS
// -----------------------------------------------------------------------------

export function isMembershipType(
    value: unknown,
): value is MembershipType {
    return (
        typeof value === "string"
        && membershipTypes.includes(
            value as MembershipType,
        )
    );
}

export function isMembershipStatus(
    value: unknown,
): value is MembershipStatus {
    return (
        typeof value === "string"
        && membershipStatuses.includes(
            value as MembershipStatus,
        )
    );
}

export function isPendingMembership(
    membership: MembershipState,
): boolean {
    return membership.status === "pending";
}

export function isActiveMembership(
    membership: MembershipState,
): boolean {
    return membership.status === "active";
}

export function isSuspendedMembership(
    membership: MembershipState,
): boolean {
    return membership.status === "suspended";
}

export function isArchivedMembership(
    membership: MembershipState,
): boolean {
    return membership.status === "archived";
}

export function isGuestMembership(
    membership: MembershipState,
): boolean {
    return membership.membershipType === "guest";
}

export function isMemberMembership(
    membership: MembershipState,
): boolean {
    return membership.membershipType === "member";
}

/**
 * @deprecated Use isMemberMembership.
 */
export const isStandardMembership =
    isMemberMembership;

// -----------------------------------------------------------------------------
// MEMBERSHIP ELIGIBILITY
// -----------------------------------------------------------------------------

export function isMembershipEligibleForTenantContext(
    membership: MembershipState,
): boolean {
    return membership.status === "active";
}