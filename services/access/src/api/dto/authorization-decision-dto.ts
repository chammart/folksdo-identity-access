// services/access/src/api/dto/authorization-decision-dto.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of an Access Operations™ authorization decision.
//
// A denied decision is a valid business result and is not inherently an HTTP
// transport failure.
//
// Boundary:
//   • exposes deterministic authorization output
//   • preserves stable Access reason codes
//   • does not expose evaluator implementation details
//   • does not expose internal policy or persistence documents
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// AUTHORIZATION RESOURCE
// -----------------------------------------------------------------------------

export interface AuthorizationResourceDto {
    readonly type: string;

    readonly id?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION
// -----------------------------------------------------------------------------

export interface AuthorizationDecisionDto {
    /**
     * Stable identifier assigned to the authorization decision.
     */
    readonly decisionId: string;

    readonly allowed: boolean;

    /**
     * Stable machine-readable explanation for the decision.
     *
     * Examples:
     *   permission_granted
     *   permission_missing
     *   explicit_deny
     *   identity_inactive
     *   membership_inactive
     *   tenant_suspended
     *   subscription_capability_missing
     *   access_restricted
     */
    readonly reasonCode: string;

    readonly actorId: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly action: string;

    readonly resource: AuthorizationResourceDto;

    /**
     * Effective permission keys resolved for the decision context.
     */
    readonly effectivePermissions:
    readonly string[];

    /**
     * Role identifiers contributing to the resolved permission set.
     */
    readonly contributingRoleIds:
    readonly string[];

    /**
     * Direct permission-assignment identifiers contributing to the result.
     */
    readonly contributingPermissionAssignmentIds:
    readonly string[];

    /**
     * Policy identifiers evaluated as part of the decision.
     */
    readonly evaluatedPolicyIds:
    readonly string[];

    /**
     * Restriction identifiers affecting the decision.
     */
    readonly appliedRestrictionIds:
    readonly string[];

    readonly decidedAt: string;
}