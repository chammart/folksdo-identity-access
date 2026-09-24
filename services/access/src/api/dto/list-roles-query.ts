// services/access/src/api/dto/list-roles-query.ts
// -----------------------------------------------------------------------------
// LIST ROLES QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve Access role definitions.
//
// Boundary:
//   • represents client filtering only
//   • does not expose persistence query syntax
//   • does not contain authorization logic
// -----------------------------------------------------------------------------

import type {
    RoleStatus,
    ApiRoleType,
} from "./role-dto";

export interface ListRolesQuery {
    /**
     * Optional Tenant authorization boundary.
     */
    readonly tenantId?: string;

    readonly type?: ApiRoleType;

    readonly status?: RoleStatus;

    /**
     * Case-insensitive search term.
     */
    readonly search?: string;

    /**
     * Maximum number of results.
     */
    readonly limit?: number;

    /**
     * Number of results to skip.
     */
    readonly offset?: number;

    /**
     * Stable sort field.
     */
    readonly sortBy?:
    | "key"
    | "name"
    | "createdAt"
    | "updatedAt";

    readonly sortDirection?:
    | "asc"
    | "desc";
}