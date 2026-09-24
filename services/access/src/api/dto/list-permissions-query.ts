// services/access/src/api/dto/list-permissions-query.ts
// -----------------------------------------------------------------------------
// LIST PERMISSIONS QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve the Access permission catalog.
// -----------------------------------------------------------------------------

import type {
    PermissionScope,
    PermissionStatus,
} from "./permission-dto";

export interface ListPermissionsQuery {
    readonly scope?: PermissionScope;

    readonly status?: PermissionStatus;

    /**
     * Case-insensitive search term.
     */
    readonly search?: string;

    readonly limit?: number;

    readonly offset?: number;

    readonly sortBy?:
    | "key"
    | "name"
    | "createdAt";

    readonly sortDirection?:
    | "asc"
    | "desc";
}