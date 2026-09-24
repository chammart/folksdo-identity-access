// services/access/src/api/dto/create-role-request.ts
// -----------------------------------------------------------------------------
// CREATE ROLE REQUEST
// -----------------------------------------------------------------------------
// Transport-safe request accepted by the Create Role API operation.
//
// Platform and system roles are platform-owned. Tenant roles require a Tenant
// authorization boundary.
// -----------------------------------------------------------------------------

import type {
    ApiRoleType,
} from "./role-dto";

export interface ApiCreateRoleRequest {
    readonly key: string;

    readonly name: string;

    readonly description: string;

    readonly type: ApiRoleType;

    /**
     * Required for Tenant roles.
     *
     * Exact eligibility remains a use-case responsibility.
     */
    readonly tenantId?: string;

    /**
     * Initial role composition.
     */
    readonly permissionIds?: readonly string[];
}