// services/access/src/state/permission-assignment.ts
// -----------------------------------------------------------------------------
// ACCESS PERMISSION ASSIGNMENT STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for direct Permission assignments.
//
// Purpose:
//   • grant or deny Permissions directly to Memberships
//   • complement Role-based Permission resolution
//   • support tenant-wide and resource-scoped authorization
//   • preserve overlapping suspension causes
//   • support deterministic revocation, archival, and expiration
//
// Boundary:
//   • Access Operations™ owns direct Permission Assignment lifecycle
//   • Membership Operations™ owns Membership lifecycle and context
//   • direct assignments do not establish tenant participation
//   • assignment duration and scope remain explicit and replayable
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT TYPE
// -----------------------------------------------------------------------------

export const permissionAssignmentTypes = [
    "grant",
    "deny",
] as const;

export type PermissionAssignmentType =
    (typeof permissionAssignmentTypes)[number];

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT STATUS
// -----------------------------------------------------------------------------

export const permissionAssignmentStatuses = [
    "pending",
    "active",
    "suspended",
    "expired",
    "archived",
    "revoked",
] as const;

export type PermissionAssignmentStatus =
    (typeof permissionAssignmentStatuses)[number];

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT SUSPENSION SOURCE
// -----------------------------------------------------------------------------

export const permissionAssignmentSuspensionSources = [
    "identity",
    "membership",
    "tenant",
    "security_policy",
] as const;

export type PermissionAssignmentSuspensionSource =
    (typeof permissionAssignmentSuspensionSources)[number];

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT ARCHIVE SOURCE
// -----------------------------------------------------------------------------

export const permissionAssignmentArchiveSources = [
    "identity",
    "membership",
    "tenant",
] as const;

export type PermissionAssignmentArchiveSource =
    (typeof permissionAssignmentArchiveSources)[number];

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT SCOPE
// -----------------------------------------------------------------------------

export interface TenantPermissionAssignmentScope {
    /**
     * Permission applies across the entire Tenant.
     */
    readonly scopeType: "tenant";
}

export interface ResourceTypePermissionAssignmentScope {
    /**
     * Permission applies to every resource of the specified type.
     */
    readonly scopeType: "resource_type";

    /**
     * Stable protected resource type.
     */
    readonly resourceType: string;
}

export interface ResourceInstancePermissionAssignmentScope {
    /**
     * Permission applies only to one protected resource instance.
     */
    readonly scopeType: "resource_instance";

    /**
     * Stable protected resource type.
     */
    readonly resourceType: string;

    /**
     * Stable protected resource instance identifier.
     */
    readonly resourceId: string;
}

export type PermissionAssignmentScope =
    | TenantPermissionAssignmentScope
    | ResourceTypePermissionAssignmentScope
    | ResourceInstancePermissionAssignmentScope;

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT STATE
// -----------------------------------------------------------------------------

export interface PermissionAssignmentState {
    /**
     * Stable Access-owned Permission Assignment identifier.
     */
    readonly assignmentId: string;

    /**
     * Membership receiving the direct Permission assignment.
     */
    readonly membershipId: string;

    /**
     * Tenant in which the Permission Assignment applies.
     */
    readonly tenantId: string;

    /**
     * Permission granted or denied by the assignment.
     */
    readonly permissionId: string;

    /**
     * Whether the assignment explicitly grants or denies the Permission.
     */
    readonly assignmentType: PermissionAssignmentType;

    /**
     * Resource boundary within which the assignment applies.
     */
    readonly scope: PermissionAssignmentScope;

    /**
     * Current Permission Assignment lifecycle state.
     */
    readonly status: PermissionAssignmentStatus;

    /**
     * Identity or platform actor that created the assignment.
     */
    readonly assignedBy: string;

    /**
     * Timestamp from which the assignment may participate in authorization.
     */
    readonly effectiveFrom: string;

    /**
     * Timestamp after which the assignment may no longer participate.
     */
    readonly expiresAt?: string;

    /**
 * Timestamp when the assignment initially became active.
 *
 * This value records the first activation and must not be replaced by
 * subsequent reactivation timestamps.
 */
    readonly activatedAt?: string;

    /**
     * Independent lifecycle conditions currently suspending the assignment.
     */
    readonly suspensionSources: readonly PermissionAssignmentSuspensionSource[];

    /**
     * Timestamp when the assignment most recently became suspended.
     */
    readonly suspendedAt?: string;

    /**
     * Timestamp when the assignment most recently became active again.
     */
    readonly reactivatedAt?: string;

    /**
     * Lifecycle source that permanently archived the assignment.
     */
    readonly archiveSource?: PermissionAssignmentArchiveSource;

    /**
     * Timestamp when the assignment was permanently archived.
     */
    readonly archivedAt?: string;

    /**
     * Timestamp when the assignment expired.
     */
    readonly expiredAt?: string;

    /**
     * Timestamp when the direct Permission was explicitly revoked.
     */
    readonly revokedAt?: string;

    /**
     * Identity or platform actor that explicitly revoked the assignment.
     */
    readonly revokedBy?: string;

    /**
     * Timestamp when the Permission Assignment was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Permission Assignment was last changed.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT STATE GUARDS
// -----------------------------------------------------------------------------

export function isPermissionAssignmentType(
    value: unknown,
): value is PermissionAssignmentType {
    return (
        typeof value === "string"
        && permissionAssignmentTypes.includes(
            value as PermissionAssignmentType,
        )
    );
}

export function isPermissionAssignmentStatus(
    value: unknown,
): value is PermissionAssignmentStatus {
    return (
        typeof value === "string"
        && permissionAssignmentStatuses.includes(
            value as PermissionAssignmentStatus,
        )
    );
}

export function isPermissionAssignmentSuspensionSource(
    value: unknown,
): value is PermissionAssignmentSuspensionSource {
    return (
        typeof value === "string"
        && permissionAssignmentSuspensionSources.includes(
            value as PermissionAssignmentSuspensionSource,
        )
    );
}

export function isPermissionAssignmentArchiveSource(
    value: unknown,
): value is PermissionAssignmentArchiveSource {
    return (
        typeof value === "string"
        && permissionAssignmentArchiveSources.includes(
            value as PermissionAssignmentArchiveSource,
        )
    );
}

export function isPermissionAssignmentScope(
    value: unknown,
): value is PermissionAssignmentScope {
    if (
        typeof value !== "object"
        || value === null
        || !("scopeType" in value)
    ) {
        return false;
    }

    const scope = value as Record<string, unknown>;

    if (scope.scopeType === "tenant") {
        return true;
    }

    if (scope.scopeType === "resource_type") {
        return typeof scope.resourceType === "string";
    }

    if (scope.scopeType === "resource_instance") {
        return (
            typeof scope.resourceType === "string"
            && typeof scope.resourceId === "string"
        );
    }

    return false;
}

export function isPendingPermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "pending";
}

export function isActivePermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "active";
}

export function isSuspendedPermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "suspended";
}

export function isExpiredPermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "expired";
}

export function isArchivedPermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "archived";
}

export function isRevokedPermissionAssignment(
    assignment: PermissionAssignmentState,
): boolean {
    return assignment.status === "revoked";
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT ELIGIBILITY
// -----------------------------------------------------------------------------

export function hasPermissionAssignmentSuspensionSource(
    assignment: PermissionAssignmentState,
    source: PermissionAssignmentSuspensionSource,
): boolean {
    return assignment.suspensionSources.includes(
        source,
    );
}

export function isPermissionAssignmentOperational(
    assignment: PermissionAssignmentState,
): boolean {
    return (
        isActivePermissionAssignment(assignment)
        && assignment.suspensionSources.length === 0
    );
}