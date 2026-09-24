// services/access/src/api/dto/list-permission-assignments-query.ts
// -----------------------------------------------------------------------------
// LIST PERMISSION ASSIGNMENTS QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve direct permission assignments.
// -----------------------------------------------------------------------------

import type {
    PermissionAssignmentEffect,
    ApiPermissionAssignmentStatus,
    PermissionAssignmentSubjectType,
} from "./permission-assignment-dto";

export interface ListPermissionAssignmentsQuery {
    readonly permissionId?: string;

    readonly subjectType?:
    PermissionAssignmentSubjectType;

    readonly subjectId?: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly effect?:
    PermissionAssignmentEffect;

    readonly status?:
    ApiPermissionAssignmentStatus;

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