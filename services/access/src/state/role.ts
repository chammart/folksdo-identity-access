// services/access/src/state/role.ts
// -----------------------------------------------------------------------------
// ACCESS ROLE STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for reusable Permission groupings.
//
// Purpose:
//   • represent reusable authorization responsibilities
//   • distinguish Platform, System, and Tenant Role families
//   • support deterministic Permission composition
//   • preserve Role ownership and lifecycle
//   • prevent archived Roles from receiving new assignments
//
// Boundary:
//   • Access Operations™ owns all Role definitions
//   • Membership Operations™ owns tenant participation
//   • Role type does not establish Membership participation
//   • Roles do not authorize actions without effective Permission evaluation
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ROLE TYPE
// -----------------------------------------------------------------------------

export const roleTypes = [
    "platform",
    "system",
    "tenant",
] as const;

export type RoleType =
    (typeof roleTypes)[number];

// -----------------------------------------------------------------------------
// ROLE LIFECYCLE STATUS
// -----------------------------------------------------------------------------

export const roleLifecycleStatuses = [
    "active",
    "archived",
] as const;

export type RoleLifecycleStatus =
    (typeof roleLifecycleStatuses)[number];

// -----------------------------------------------------------------------------
// ROLE STATE
// -----------------------------------------------------------------------------

export interface RoleState {
    /**
     * Stable Access-owned Role identifier.
     */
    readonly roleId: string;

    /**
     * Stable business key used by the public Access Role contract.
     *
     * Newly created Roles always persist this value. It remains optional on
     * canonical state temporarily so legacy persisted Role documents created
     * before the hardened public projection can still be read safely.
     */
    readonly key?: string;

    /**
     * Authorization Role family.
     *
     * Platform Roles protect Folksdo™ administration.
     * System Roles represent Folksdo-defined tenant responsibilities.
     * Tenant Roles are created by tenant administrators.
     */
    readonly roleType: RoleType;

    /**
     * Tenant that owns the Role.
     *
     * Required only for Tenant Roles.
     * Platform and System Roles are globally defined.
     */
    readonly tenantId?: string;

    /**
     * Human-readable Role name.
     */
    readonly name: string;

    /**
     * Human-readable explanation of the Role responsibility.
     */
    readonly description: string;

    /**
     * Canonical Permission identifiers composed by this Role.
     *
     * Role composition is Access-owned state. Authorization derives
     * Role-to-Permission bindings from this collection rather than from
     * transport metadata or certification-only fixtures.
     */
    readonly permissionIds: readonly string[];

    /**
     * Current Role lifecycle state.
     */
    readonly lifecycleStatus: RoleLifecycleStatus;

    /**
     * Identity that created the Role.
     *
     * System and Platform Roles may use a stable platform actor identifier.
     */
    readonly createdBy: string;

    /**
     * Timestamp when the Role was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Role was last changed.
     */
    readonly updatedAt: string;

    /**
     * Timestamp when the Role was archived.
     *
     * Preserved after restoration as historical lifecycle metadata.
     */
    readonly archivedAt?: string;

    /**
     * Identity that archived the Role.
     *
     * Preserved after restoration as historical lifecycle metadata.
     */
    readonly archivedBy?: string;

    /**
     * Timestamp when the Role was most recently restored.
     */
    readonly restoredAt?: string;

    /**
     * Identity that most recently restored the Role.
     */
    readonly restoredBy?: string;
}

// -----------------------------------------------------------------------------
// ROLE STATE GUARDS
// -----------------------------------------------------------------------------

export function isRoleType(
    value: unknown,
): value is RoleType {
    return (
        typeof value === "string"
        && roleTypes.includes(
            value as RoleType,
        )
    );
}

export function isRoleLifecycleStatus(
    value: unknown,
): value is RoleLifecycleStatus {
    return (
        typeof value === "string"
        && roleLifecycleStatuses.includes(
            value as RoleLifecycleStatus,
        )
    );
}

export function isPlatformRole(
    role: RoleState,
): boolean {
    return role.roleType === "platform";
}

export function isSystemRole(
    role: RoleState,
): boolean {
    return role.roleType === "system";
}

export function isTenantRole(
    role: RoleState,
): boolean {
    return role.roleType === "tenant";
}

export function isActiveRole(
    role: RoleState,
): boolean {
    return role.lifecycleStatus === "active";
}

export function isArchivedRole(
    role: RoleState,
): boolean {
    return role.lifecycleStatus === "archived";
}

// -----------------------------------------------------------------------------
// ROLE OWNERSHIP GUARDS
// -----------------------------------------------------------------------------

export function roleRequiresTenant(
    roleType: RoleType,
): boolean {
    return roleType === "tenant";
}

export function roleMayBeAssignedToTenantMembership(
    role: RoleState,
    tenantId: string,
): boolean {
    if (!isActiveRole(role)) {
        return false;
    }

    if (isTenantRole(role)) {
        return role.tenantId === tenantId;
    }

    return isSystemRole(role);
}