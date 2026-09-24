// services/access/src/api/dto/list-policies-query.ts
// -----------------------------------------------------------------------------
// LIST POLICIES QUERY
// -----------------------------------------------------------------------------
// Transport-safe query used to retrieve Access authorization policies.
// -----------------------------------------------------------------------------

import type {
    AuthorizationPolicyEffect,
    ApiAuthorizationPolicyScope,
    AuthorizationPolicyStatus,
} from "./authorization-policy-dto";

export interface ListPoliciesQuery {
    readonly tenantId?: string;

    readonly scope?:
    ApiAuthorizationPolicyScope;

    readonly effect?:
    AuthorizationPolicyEffect;

    readonly status?:
    AuthorizationPolicyStatus;

    /**
     * Searches policy key, name and description.
     */
    readonly search?: string;

    readonly permissionKey?: string;

    readonly resourceType?: string;

    readonly limit?: number;

    readonly offset?: number;

    readonly sortBy?:
    | "priority"
    | "name"
    | "createdAt"
    | "updatedAt";

    readonly sortDirection?:
    | "asc"
    | "desc";
}