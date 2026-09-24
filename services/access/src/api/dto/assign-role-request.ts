// services/access/src/api/dto/assign-role-request.ts
// -----------------------------------------------------------------------------
// ASSIGN ROLE REQUEST
// -----------------------------------------------------------------------------
// Transport-safe command for assigning a role to an authorization subject.
//
// Membership eligibility, role scope compatibility and lifecycle validation
// remain Access use-case responsibilities.
// -----------------------------------------------------------------------------

import type {
    RoleAssignmentSubjectType,
} from "./role-assignment-dto";

export interface ApiAssignRoleRequest {
    readonly roleId: string;

    readonly subjectType: RoleAssignmentSubjectType;

    readonly subjectId: string;

    /**
     * Required when the assignment is associated with a specific Identity.
     */
    readonly identityId?: string;

    /**
     * Required for Membership-based Tenant assignments.
     */
    readonly membershipId?: string;

    /**
     * Tenant authorization boundary when applicable.
     */
    readonly tenantId?: string;

    /**
     * Optional ISO 8601 expiration time.
     */
    readonly expiresAt?: string;
}