// services/access/src/api/dto/update-policy-request.ts
// -----------------------------------------------------------------------------
// UPDATE POLICY REQUEST
// -----------------------------------------------------------------------------
// Transport-safe command for updating a mutable authorization policy.
//
// The policy identifier is normally supplied through the route path. Lifecycle
// transitions must use dedicated commands rather than this request.
// -----------------------------------------------------------------------------

import type {
    AuthorizationPolicyConditionDto,
    AuthorizationPolicyEffect,
} from "./authorization-policy-dto";

export interface ApiUpdatePolicyRequest {
    readonly policyId: string;

    readonly name?: string;

    readonly description?: string;

    /**
     * Complete replacement when supplied.
     */
    readonly permissionKeys?: readonly string[];

    /**
     * Complete replacement when supplied.
     */
    readonly resourceTypes?: readonly string[];

    readonly effect?: AuthorizationPolicyEffect;

    readonly priority?: number;

    /**
     * Complete replacement condition set when supplied.
     */
    readonly conditions?:
    readonly AuthorizationPolicyConditionDto[];
}