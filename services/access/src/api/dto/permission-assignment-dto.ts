// services/access/src/api/dto/permission-assignment-dto.ts
// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of a direct Access permission assignment.
//
// Direct permission assignments may explicitly grant or deny a permission.
// Effective authorization remains the responsibility of the authorization
// evaluator and permission-precedence rules.
//
// Boundary:
//   • exposes Access-owned direct assignment state
//   • does not expose internal evaluation or persistence structures
//   • does not expose provider-specific authorization records
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT CLASSIFICATION
// -----------------------------------------------------------------------------

export type PermissionAssignmentEffect =
    | "grant"
    | "deny";

export type ApiPermissionAssignmentStatus =
    | "pending"
    | "active"
    | "suspended"
    | "revoked"
    | "expired"
    | "archived";

export type PermissionAssignmentSubjectType =
    | "identity"
    | "membership";

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT DTO
// -----------------------------------------------------------------------------

export interface PermissionAssignmentDto {
    /**
     * Stable Access-owned permission-assignment identifier.
     */
    readonly assignmentId: string;

    readonly permissionId: string;

    readonly subjectType: PermissionAssignmentSubjectType;

    readonly subjectId: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    /**
     * Explicit precedence-bearing effect.
     */
    readonly effect: PermissionAssignmentEffect;

    readonly status: ApiPermissionAssignmentStatus;

    readonly expiresAt?: string;

    readonly assignedBy: string;

    readonly assignedAt: string;

    readonly updatedAt: string;

    readonly suspendedAt?: string;

    readonly reactivatedAt?: string;

    readonly revokedAt?: string;

    readonly expiredAt?: string;

    readonly archivedAt?: string;

    readonly lifecycleReason?: string;
}