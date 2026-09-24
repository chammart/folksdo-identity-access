// services/access/src/authorization/authorization-decision.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION
// -----------------------------------------------------------------------------
// Canonical Access authorization result.
//
// Purpose:
//   • return deterministic Allow or Deny decisions
//   • preserve machine-readable decision reasons
//   • expose the Permission and authorization evidence used
//   • support authorization audit recording
//   • keep transport concerns outside the authorization domain
//
// Boundary:
//   • represents the result of deterministic authorization evaluation
//   • contains no transport-specific status codes or response payloads
//   • performs no persistence, logging, or event publication
//   • preserves stable reason codes suitable for audit and diagnostics
// -----------------------------------------------------------------------------

import type {
    AccessPermissionKey,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// DECISION
// -----------------------------------------------------------------------------

export type AuthorizationDecisionValue =
    | "allow"
    | "deny";

// -----------------------------------------------------------------------------
// REASON CODE
// -----------------------------------------------------------------------------

export type AuthorizationDecisionReasonCode =
    | "membership_invalid"
    | "permission_not_found"
    | "permission_not_effective"
    | "permission_denied"
    | "subscription_capability_denied"
    | "access_restricted"
    | "policy_denied"
    | "permission_granted"
    | "default_deny";

// -----------------------------------------------------------------------------
// EVIDENCE SOURCE
// -----------------------------------------------------------------------------

export type AuthorizationEvidenceSource =
    | "role_assignment"
    | "permission_assignment"
    | "access_restriction"
    | "authorization_policy"
    | "permission_catalog"
    | "membership"
    | "subscription_capability"
    | "default";

// -----------------------------------------------------------------------------
// EVIDENCE
// -----------------------------------------------------------------------------

export interface AuthorizationDecisionEvidence {
    /**
     * Authorization source that contributed to the decision.
     */
    readonly source: AuthorizationEvidenceSource;

    /**
     * Identifier of the assignment, restriction, Policy, or known fact.
     */
    readonly sourceId?: string;

    /**
     * Additional stable explanation suitable for diagnostics and audit.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION
// -----------------------------------------------------------------------------

export interface AuthorizationDecision {
    /**
     * Final deterministic authorization outcome.
     */
    readonly decision: AuthorizationDecisionValue;

    /**
     * Stable machine-readable reason for the outcome.
     */
    readonly reasonCode: AuthorizationDecisionReasonCode;

    /**
     * Membership through which Tenant authorization was evaluated.
     */
    readonly membershipId: string;

    /**
     * Tenant authorization boundary.
     */
    readonly tenantId: string;

    /**
     * Resolved Permission Catalog identifier.
     *
     * Omitted when no Permission Catalog entry matched the request.
     */
    readonly permissionId?: string;

    /**
     * Canonical requested Permission key.
     */
    readonly permissionKey: AccessPermissionKey;

    /**
     * Optional protected resource type.
     */
    readonly resourceType?: string;

    /**
     * Optional protected resource instance identifier.
     */
    readonly resourceId?: string;

    /**
     * Timestamp at which the decision was evaluated.
     */
    readonly evaluatedAt: string;

    /**
     * Stable authorization evidence contributing to the decision.
     */
    readonly evidence: readonly AuthorizationDecisionEvidence[];
}

// -----------------------------------------------------------------------------
// ALLOW DECISION
// -----------------------------------------------------------------------------

export function createAllowAuthorizationDecision(
    input: Omit<
        AuthorizationDecision,
        "decision"
    >,
): AuthorizationDecision {
    return {
        ...input,

        decision: "allow",
    };
}

// -----------------------------------------------------------------------------
// DENY DECISION
// -----------------------------------------------------------------------------

export function createDenyAuthorizationDecision(
    input: Omit<
        AuthorizationDecision,
        "decision"
    >,
): AuthorizationDecision {
    return {
        ...input,

        decision: "deny",
    };
}