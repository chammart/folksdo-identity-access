// services/access/src/authorization/authorization-policy-evaluator.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY EVALUATOR
// -----------------------------------------------------------------------------
// Deterministic interpreter for the currently supported Access Policy rule
// shape.
//
// Purpose:
//   • evaluate active canonical Authorization Policy state
//   • normalize applicable Policy outcomes for AuthorizationEvaluator
//   • keep Policy interpretation provider-neutral and infrastructure-free
//   • fail closed when an active Policy contains malformed supported rules
//   • ensure Policies constrain authorization but never create Permission grants
//
// Supported rule fields:
//   • effect: "allow" | "deny"
//   • identityId?: string
//   • membershipId?: string
//   • tenantId?: string
//   • permissionId?: string
//   • resourceType?: string
//   • resourceId?: string
//   • reason?: string
//
// Boundary:
//   • consumes canonical AuthorizationPolicyState
//   • does not load Policies
//   • does not mutate Policy state
//   • does not authenticate or resolve Membership Context
//   • does not grant authorization
// -----------------------------------------------------------------------------

import type {
    AuthorizationPolicyState,
} from "../state";

import type {
    AuthorizationPolicyResult,
} from "./authorization-evaluator";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface EvaluateAuthorizationPolicyInput {
    readonly policy:
    AuthorizationPolicyState;

    readonly identityId:
    string;

    readonly membershipId:
    string;

    readonly tenantId:
    string;

    readonly permissionId:
    string;

    readonly resourceType?:
    string;

    readonly resourceId?:
    string;
}

// -----------------------------------------------------------------------------
// SUPPORTED POLICY RULE
// -----------------------------------------------------------------------------

interface SupportedAuthorizationPolicyRule {
    readonly effect:
    | "allow"
    | "deny";

    readonly identityId?:
    string;

    readonly membershipId?:
    string;

    readonly tenantId?:
    string;

    readonly permissionId?:
    string;

    readonly resourceType?:
    string;

    readonly resourceId?:
    string;

    readonly reason?:
    string;
}

// -----------------------------------------------------------------------------
// EVALUATE AUTHORIZATION POLICY
// -----------------------------------------------------------------------------

export function evaluateAuthorizationPolicy(
    input: EvaluateAuthorizationPolicyInput,
): AuthorizationPolicyResult | null {
    if (
        input.policy.lifecycleStatus
        !== "active"
    ) {
        return null;
    }

    if (
        input.policy.scope === "tenant"
        && input.policy.tenantId
        !== input.tenantId
    ) {
        return null;
    }

    const rule =
        parseSupportedAuthorizationPolicyRule(
            input.policy.evaluationRules,
        );

    if (rule === null) {
        return {
            policyId:
                input.policy.policyId,

            effect:
                "deny",

            reason:
                "Active authorization policy contains invalid or unsupported evaluation rules.",
        };
    }

    if (
        rule.identityId !== undefined
        && rule.identityId !== input.identityId
    ) {
        return null;
    }

    if (
        rule.membershipId !== undefined
        && rule.membershipId !== input.membershipId
    ) {
        return null;
    }

    if (
        rule.tenantId !== undefined
        && rule.tenantId !== input.tenantId
    ) {
        return null;
    }

    if (
        rule.permissionId !== undefined
        && rule.permissionId !== input.permissionId
    ) {
        return null;
    }

    if (
        rule.resourceType !== undefined
        && rule.resourceType !== input.resourceType
    ) {
        return null;
    }

    if (
        rule.resourceId !== undefined
        && rule.resourceId !== input.resourceId
    ) {
        return null;
    }

    return {
        policyId:
            input.policy.policyId,

        effect:
            rule.effect,

        ...(rule.reason === undefined
            ? {}
            : {
                reason:
                    rule.reason,
            }),
    };
}

// -----------------------------------------------------------------------------
// PARSE SUPPORTED POLICY RULE
// -----------------------------------------------------------------------------

function parseSupportedAuthorizationPolicyRule(
    rules: Readonly<Record<string, unknown>>,
): SupportedAuthorizationPolicyRule | null {
    const allowedKeys =
        new Set([
            "effect",
            "identityId",
            "membershipId",
            "tenantId",
            "permissionId",
            "resourceType",
            "resourceId",
            "reason",
        ]);

    if (
        Object.keys(rules).some(
            key => !allowedKeys.has(key),
        )
    ) {
        return null;
    }

    if (
        rules.effect !== "allow"
        && rules.effect !== "deny"
    ) {
        return null;
    }

    const optionalStringFields = [
        "identityId",
        "membershipId",
        "tenantId",
        "permissionId",
        "resourceType",
        "resourceId",
        "reason",
    ] as const;

    for (
        const field
        of optionalStringFields
    ) {
        const value =
            rules[field];

        if (
            value !== undefined
            && typeof value !== "string"
        ) {
            return null;
        }
    }

    return {
        effect:
            rules.effect,

        ...(rules.identityId === undefined
            ? {}
            : {
                identityId:
                    rules.identityId as string,
            }),

        ...(rules.membershipId === undefined
            ? {}
            : {
                membershipId:
                    rules.membershipId as string,
            }),

        ...(rules.tenantId === undefined
            ? {}
            : {
                tenantId:
                    rules.tenantId as string,
            }),

        ...(rules.permissionId === undefined
            ? {}
            : {
                permissionId:
                    rules.permissionId as string,
            }),

        ...(rules.resourceType === undefined
            ? {}
            : {
                resourceType:
                    rules.resourceType as string,
            }),

        ...(rules.resourceId === undefined
            ? {}
            : {
                resourceId:
                    rules.resourceId as string,
            }),

        ...(rules.reason === undefined
            ? {}
            : {
                reason:
                    rules.reason as string,
            }),
    };
}
