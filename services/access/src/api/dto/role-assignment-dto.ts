// services/access/src/api/dto/role-assignment-dto.ts
// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of a role assigned to an authorization subject.
//
// Boundary:
//   • represents Access-owned assignment state
//   • references external Identity, Membership and Tenant facts by identifier
//   • does not expose external service records directly
//   • does not expose persistence-provider metadata
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT STATUS
// -----------------------------------------------------------------------------

export type ApiRoleAssignmentStatus =
    | "pending"
    | "active"
    | "suspended"
    | "removed"
    | "expired"
    | "archived";

export type RoleAssignmentSubjectType =
    | "identity"
    | "membership";

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT DTO
// -----------------------------------------------------------------------------

export interface RoleAssignmentDto {
    /**
     * Stable Access-owned role-assignment identifier.
     */
    readonly assignmentId: string;

    readonly roleId: string;

    /**
     * Authorization subject receiving the role.
     */
    readonly subjectType: RoleAssignmentSubjectType;

    readonly subjectId: string;

    /**
     * Identity related to the assignment when known.
     */
    readonly identityId?: string;

    /**
     * Membership related to a Tenant-scoped assignment.
     */
    readonly membershipId?: string;

    /**
     * Tenant boundary for Tenant-scoped assignments.
     */
    readonly tenantId?: string;

    readonly status: ApiRoleAssignmentStatus;

    /**
     * Optional expiration time for a time-bound assignment.
     */
    readonly expiresAt?: string;

    readonly assignedBy: string;

    readonly assignedAt: string;

    readonly updatedAt: string;

    readonly suspendedAt?: string;

    readonly reactivatedAt?: string;

    readonly removedAt?: string;

    readonly expiredAt?: string;

    readonly archivedAt?: string;

    /**
     * Stable lifecycle reason retained for audit and support.
     */
    readonly lifecycleReason?: string;
}