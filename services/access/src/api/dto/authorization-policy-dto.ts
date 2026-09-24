// services/access/src/api/dto/authorization-policy-dto.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of an Access Operations™ authorization policy.
//
// Policies refine authorization decisions using explicit conditions and effects.
//
// Boundary:
//   • exposes transport-safe policy definitions
//   • does not expose executable functions or persistence expressions
//   • does not expose authorization evaluator internals
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// POLICY CLASSIFICATION
// -----------------------------------------------------------------------------

export type ApiAuthorizationPolicyScope =
    | "platform"
    | "tenant";

export type AuthorizationPolicyEffect =
    | "allow"
    | "deny";

export type AuthorizationPolicyStatus =
    | "active"
    | "archived";

// -----------------------------------------------------------------------------
// POLICY CONDITION
// -----------------------------------------------------------------------------

export type AuthorizationPolicyOperator =
    | "equals"
    | "not_equals"
    | "in"
    | "not_in"
    | "exists"
    | "not_exists";

export interface AuthorizationPolicyConditionDto {
    /**
     * Canonical context path evaluated by the authorization evaluator.
     *
     * Example:
     *   actor.type
     *   resource.ownerId
     *   context.region
     */
    readonly field: string;

    readonly operator: AuthorizationPolicyOperator;

    /**
     * Optional comparison value.
     *
     * Exists and not-exists operators do not require a value.
     */
    readonly value?: unknown;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY DTO
// -----------------------------------------------------------------------------

export interface AuthorizationPolicyDto {
    readonly policyId: string;

    readonly key: string;

    readonly name: string;

    readonly description?: string;

    readonly scope: ApiAuthorizationPolicyScope;

    readonly tenantId?: string;

    /**
     * Permission keys to which the policy applies.
     */
    readonly permissionKeys: readonly string[];

    /**
     * Optional protected resource types constrained by the policy.
     */
    readonly resourceTypes: readonly string[];

    readonly effect: AuthorizationPolicyEffect;

    /**
     * Lower numbers are evaluated before higher numbers.
     */
    readonly priority: number;

    readonly conditions:
    readonly AuthorizationPolicyConditionDto[];

    readonly status: AuthorizationPolicyStatus;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly archivedAt?: string;
}