// services/access/src/api/dto/create-policy-request.ts
// -----------------------------------------------------------------------------
// CREATE POLICY REQUEST
// -----------------------------------------------------------------------------
// Transport-safe command for creating an Access authorization policy.
//
// Validation confirms request shape only. Policy compatibility, lifecycle and
// semantic correctness remain Access application responsibilities.
// -----------------------------------------------------------------------------

import type {
    AuthorizationPolicyConditionDto,
    AuthorizationPolicyEffect,
    ApiAuthorizationPolicyScope,
} from "./authorization-policy-dto";

export interface ApiCreatePolicyRequest {
    readonly key: string;

    readonly name: string;

    readonly description?: string;

    readonly scope: ApiAuthorizationPolicyScope;

    /**
     * Required for Tenant-scoped policies.
     */
    readonly tenantId?: string;

    /**
     * Permissions affected by the policy.
     */
    readonly permissionKeys: readonly string[];

    /**
     * Optional protected resource types affected by the policy.
     */
    readonly resourceTypes?: readonly string[];

    readonly effect: AuthorizationPolicyEffect;

    /**
     * Lower values are evaluated earlier.
     */
    readonly priority: number;

    readonly conditions:
    readonly AuthorizationPolicyConditionDto[];
}