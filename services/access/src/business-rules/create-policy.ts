// services/access/src/business-rules/create-policy.ts
// -----------------------------------------------------------------------------
// CREATE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • create deterministic Authorization Policy state
//   • initialize Policy versioning
//   • enforce Platform and Tenant Policy ownership boundaries
//   • initialize Policy lifecycle as Draft
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not emit events or publish messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    AuthorizationContextInvalidError,
} from "../errors";

import type {
    AuthorizationPolicyEvaluationRules,
    AuthorizationPolicyScope,
    AuthorizationPolicyState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreatePolicyInput {
    /**
     * Stable Access-owned Authorization Policy identifier.
     */
    readonly policyId: string;

    /**
     * Human-readable Authorization Policy name.
     */
    readonly name: string;

    /**
     * Authorization Policy ownership scope.
     */
    readonly scope: AuthorizationPolicyScope;

    /**
     * Tenant owner for Tenant-scoped Authorization Policies.
     *
     * Platform-scoped Authorization Policies must not carry a Tenant identifier.
     */
    readonly tenantId?: string;

    /**
     * Canonical deterministic Policy evaluation rules.
     */
    readonly evaluationRules: AuthorizationPolicyEvaluationRules;

    /**
     * Actor responsible for creating the Authorization Policy.
     */
    readonly createdBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// CREATE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------

export function createPolicy(
    input: CreatePolicyInput,
): AuthorizationPolicyState {
    if (
        input.scope === "tenant"
        && !input.tenantId
    ) {
        throw new AuthorizationContextInvalidError(
            "Tenant Authorization Policies require a tenant identifier.",
        );
    }

    if (
        input.scope === "platform"
        && input.tenantId
    ) {
        throw new AuthorizationContextInvalidError(
            "Platform Authorization Policies may not be tenant-owned.",
        );
    }

    return {
        policyId: input.policyId,

        name: input.name,

        scope: input.scope,

        tenantId: input.tenantId,

        version: 1,

        lifecycleStatus: "draft",

        evaluationRules: input.evaluationRules,

        createdBy: input.createdBy,

        createdAt: input.now,

        updatedAt: input.now,
    };
}