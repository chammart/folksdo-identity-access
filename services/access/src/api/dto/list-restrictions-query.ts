// services/access/src/api/dto/list-restrictions-query.ts
// -----------------------------------------------------------------------------
// LIST RESTRICTIONS QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve Access restrictions.
// -----------------------------------------------------------------------------

import type {
    AccessRestrictionScope,
    ApiAccessRestrictionStatus,
    AccessRestrictionSubjectType,
} from "./access-restriction-dto";

export interface ListRestrictionsQuery {
    readonly subjectType?:
    AccessRestrictionSubjectType;

    readonly subjectId?: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly scope?:
    AccessRestrictionScope;

    readonly status?:
    ApiAccessRestrictionStatus;

    readonly permissionKey?: string;

    readonly resourceType?: string;

    readonly expiresBefore?: string;

    readonly limit?: number;

    readonly offset?: number;

    readonly sortBy?:
    | "createdAt"
    | "expiresAt"
    | "updatedAt";

    readonly sortDirection?:
    | "asc"
    | "desc";
}