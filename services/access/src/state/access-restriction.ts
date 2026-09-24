// services/access/src/state/access-restriction.ts
// -----------------------------------------------------------------------------
// ACCESS RESTRICTION STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for explicit authorization restrictions.
//
// Purpose:
//   • reduce or remove authorization explicitly
//   • support Membership, Tenant, Role, Permission, and resource restrictions
//   • preserve restriction applicability and lifecycle
//   • support deterministic expiration and removal
//   • ensure restrictions participate in authorization evaluation
//
// Boundary:
//   • Access Operations™ owns Restriction lifecycle
//   • Restrictions never grant authorization
//   • Restrictions do not establish Membership Context
//   • Restrictions override otherwise eligible authorization paths
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION STATUS
// -----------------------------------------------------------------------------

export const accessRestrictionStatuses = [
    "active",
    "expired",
    "removed",
] as const;

export type AccessRestrictionStatus =
    (typeof accessRestrictionStatuses)[number];

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION TARGET
// -----------------------------------------------------------------------------

export interface MembershipAccessRestrictionTarget {
    /**
     * Restriction applies to one Membership.
     */
    readonly targetType: "membership";

    /**
     * Restricted Membership identifier.
     */
    readonly membershipId: string;
}

export interface TenantAccessRestrictionTarget {
    /**
     * Restriction applies across one Tenant.
     */
    readonly targetType: "tenant";

    /**
     * Restricted Tenant identifier.
     */
    readonly tenantId: string;
}

export interface RoleAccessRestrictionTarget {
    /**
     * Restriction applies to authorization derived from one Role.
     */
    readonly targetType: "role";

    /**
     * Restricted Role identifier.
     */
    readonly roleId: string;
}

export interface PermissionAccessRestrictionTarget {
    /**
     * Restriction applies to one Permission.
     */
    readonly targetType: "permission";

    /**
     * Restricted Permission identifier.
     */
    readonly permissionId: string;
}

export interface ResourceTypeAccessRestrictionTarget {
    /**
     * Restriction applies to a protected resource type.
     */
    readonly targetType: "resource_type";

    /**
     * Restricted resource type.
     */
    readonly resourceType: string;
}

export interface ResourceInstanceAccessRestrictionTarget {
    /**
     * Restriction applies to one protected resource instance.
     */
    readonly targetType: "resource_instance";

    /**
     * Restricted resource type.
     */
    readonly resourceType: string;

    /**
     * Restricted resource instance identifier.
     */
    readonly resourceId: string;
}

export type AccessRestrictionTarget =
    | MembershipAccessRestrictionTarget
    | TenantAccessRestrictionTarget
    | RoleAccessRestrictionTarget
    | PermissionAccessRestrictionTarget
    | ResourceTypeAccessRestrictionTarget
    | ResourceInstanceAccessRestrictionTarget;

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION STATE
// -----------------------------------------------------------------------------

export interface AccessRestrictionState {
    /**
     * Stable Access-owned Restriction identifier.
     */
    readonly restrictionId: string;

    /**
 * Tenant authorization boundary in which the Restriction applies.
 *
 * Required for tenant authorization restrictions.
 * Omitted only for Platform-level restrictions.
 */
    readonly tenantId?: string;

    /**
     * Authorization subject or resource affected by the Restriction.
     */
    readonly target: AccessRestrictionTarget;

    /**
     * Stable business reason explaining why authorization is restricted.
     */
    readonly restrictionReason: string;

    /**
     * Current Restriction lifecycle state.
     */
    readonly status: AccessRestrictionStatus;

    /**
     * Timestamp from which the Restriction participates in authorization.
     */
    readonly effectiveFrom: string;

    /**
     * Timestamp after which the Restriction no longer participates.
     */
    readonly expiresAt?: string;

    /**
     * Identity or platform actor that created the Restriction.
     */
    readonly createdBy: string;

    /**
     * Timestamp when the Restriction was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Restriction was last changed.
     */
    readonly updatedAt: string;

    /**
     * Timestamp when the Restriction expired.
     */
    readonly expiredAt?: string;

    /**
     * Timestamp when the Restriction was explicitly removed.
     */
    readonly removedAt?: string;

    /**
     * Identity or platform actor that explicitly removed the Restriction.
     */
    readonly removedBy?: string;
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION STATE GUARDS
// -----------------------------------------------------------------------------

export function isAccessRestrictionStatus(
    value: unknown,
): value is AccessRestrictionStatus {
    return (
        typeof value === "string"
        && accessRestrictionStatuses.includes(
            value as AccessRestrictionStatus,
        )
    );
}

export function isAccessRestrictionTarget(
    value: unknown,
): value is AccessRestrictionTarget {
    if (
        typeof value !== "object"
        || value === null
        || !("targetType" in value)
    ) {
        return false;
    }

    const target = value as Record<string, unknown>;

    if (target.targetType === "membership") {
        return typeof target.membershipId === "string";
    }

    if (target.targetType === "tenant") {
        return typeof target.tenantId === "string";
    }

    if (target.targetType === "role") {
        return typeof target.roleId === "string";
    }

    if (target.targetType === "permission") {
        return typeof target.permissionId === "string";
    }

    if (target.targetType === "resource_type") {
        return typeof target.resourceType === "string";
    }

    if (target.targetType === "resource_instance") {
        return (
            typeof target.resourceType === "string"
            && typeof target.resourceId === "string"
        );
    }

    return false;
}

export function isActiveAccessRestriction(
    restriction: AccessRestrictionState,
): boolean {
    return restriction.status === "active";
}

export function isExpiredAccessRestriction(
    restriction: AccessRestrictionState,
): boolean {
    return restriction.status === "expired";
}

export function isRemovedAccessRestriction(
    restriction: AccessRestrictionState,
): boolean {
    return restriction.status === "removed";
}