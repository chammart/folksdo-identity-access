// services/access/src/state/role-assignment.ts
// -----------------------------------------------------------------------------
// ACCESS ROLE ASSIGNMENT STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for assigning Roles to Memberships.
//
// Purpose:
//   • assign reusable Roles to tenant authorization subjects
//   • preserve Membership and Tenant authorization boundaries
//   • support pending, active, suspended, expired, archived, and removed states
//   • preserve overlapping suspension causes
//   • support deterministic activation, restoration, and expiration
//
// Boundary:
//   • Membership Operations™ owns Membership lifecycle and context
//   • Access Operations™ owns Role Assignment lifecycle
//   • tenant authorization is evaluated through Membership
//   • Platform Role assignment is outside this Membership assignment model
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT STATUS
// -----------------------------------------------------------------------------

export const roleAssignmentStatuses = [
    "pending",
    "active",
    "suspended",
    "expired",
    "archived",
    "removed",
] as const;

export type RoleAssignmentStatus =
    (typeof roleAssignmentStatuses)[number];

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT SUSPENSION SOURCE
// -----------------------------------------------------------------------------

export const roleAssignmentSuspensionSources = [
    "identity",
    "membership",
    "tenant",
    "security_policy",
] as const;

export type RoleAssignmentSuspensionSource =
    (typeof roleAssignmentSuspensionSources)[number];

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT ARCHIVE SOURCE
// -----------------------------------------------------------------------------

export const roleAssignmentArchiveSources = [
    "identity",
    "membership",
    "tenant",
] as const;

export type RoleAssignmentArchiveSource =
    (typeof roleAssignmentArchiveSources)[number];

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT STATE
// -----------------------------------------------------------------------------

export interface RoleAssignmentState {
    /**
     * Stable Access-owned Role Assignment identifier.
     */
    readonly assignmentId: string;

    /**
     * Membership receiving the Role.
     *
     * Tenant authorization is always evaluated through Membership.
     */
    readonly membershipId: string;

    /**
     * Role assigned to the Membership.
     */
    readonly roleId: string;

    /**
     * Tenant in which the Role Assignment applies.
     */
    readonly tenantId: string;

    /**
     * Current Role Assignment lifecycle state.
     */
    readonly status: RoleAssignmentStatus;

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
     *
     * Each restoration reaction removes only the condition it owns.
     * The assignment may return to Active only when no suspension sources
     * remain and all authorization eligibility requirements are satisfied.
     */
    readonly suspensionSources: readonly RoleAssignmentSuspensionSource[];

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
    readonly archiveSource?: RoleAssignmentArchiveSource;

    /**
     * Timestamp when the assignment was permanently archived.
     */
    readonly archivedAt?: string;

    /**
     * Timestamp when the assignment expired.
     */
    readonly expiredAt?: string;

    /**
     * Timestamp when the assignment was explicitly removed.
     */
    readonly removedAt?: string;

    /**
     * Identity or platform actor that explicitly removed the assignment.
     */
    readonly removedBy?: string;

    /**
     * Timestamp when the Role Assignment was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Role Assignment was last changed.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT STATE GUARDS
// -----------------------------------------------------------------------------

export function isRoleAssignmentStatus(
    value: unknown,
): value is RoleAssignmentStatus {
    return (
        typeof value === "string"
        && roleAssignmentStatuses.includes(
            value as RoleAssignmentStatus,
        )
    );
}

export function isRoleAssignmentSuspensionSource(
    value: unknown,
): value is RoleAssignmentSuspensionSource {
    return (
        typeof value === "string"
        && roleAssignmentSuspensionSources.includes(
            value as RoleAssignmentSuspensionSource,
        )
    );
}

export function isRoleAssignmentArchiveSource(
    value: unknown,
): value is RoleAssignmentArchiveSource {
    return (
        typeof value === "string"
        && roleAssignmentArchiveSources.includes(
            value as RoleAssignmentArchiveSource,
        )
    );
}

export function isPendingRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "pending";
}

export function isActiveRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "active";
}

export function isSuspendedRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "suspended";
}

export function isExpiredRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "expired";
}

export function isArchivedRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "archived";
}

export function isRemovedRoleAssignment(
    assignment: RoleAssignmentState,
): boolean {
    return assignment.status === "removed";
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT ELIGIBILITY
// -----------------------------------------------------------------------------

export function hasRoleAssignmentSuspensionSource(
    assignment: RoleAssignmentState,
    source: RoleAssignmentSuspensionSource,
): boolean {
    return assignment.suspensionSources.includes(
        source,
    );
}

export function isRoleAssignmentOperational(
    assignment: RoleAssignmentState,
): boolean {
    return (
        isActiveRoleAssignment(assignment)
        && assignment.suspensionSources.length === 0
    );
}