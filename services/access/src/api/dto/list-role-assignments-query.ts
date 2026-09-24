// services/access/src/api/dto/list-role-assignments-query.ts
// -----------------------------------------------------------------------------
// LIST ROLE ASSIGNMENTS QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve Access role assignments.
// -----------------------------------------------------------------------------

import type {
    ApiRoleAssignmentStatus,
    RoleAssignmentSubjectType,
} from "./role-assignment-dto";

export interface ListRoleAssignmentsQuery {
    readonly roleId?: string;

    readonly subjectType?:
    RoleAssignmentSubjectType;

    readonly subjectId?: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly status?: ApiRoleAssignmentStatus;

    /**
     * Returns assignments expiring before this ISO timestamp.
     */
    readonly expiresBefore?: string;

    readonly limit?: number;

    readonly offset?: number;

    readonly sortBy?:
    | "assignedAt"
    | "expiresAt"
    | "updatedAt";

    readonly sortDirection?:
    | "asc"
    | "desc";
}