// services/access/src/state/authorization-policy.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHORIZATION POLICY STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for deterministic authorization policies.
//
// Purpose:
//   • represent deterministic authorization evaluation rules
//   • support policy versioning
//   • preserve policy lifecycle and replayability
//   • distinguish Platform and Tenant policy applicability
//   • ensure only active Policies participate in authorization
//
// Boundary:
//   • Access Operations™ owns authorization policy state
//   • Identity Operations™ owns authentication
//   • Membership Operations™ owns Membership Context
//   • Policies may constrain authorization but never establish identity or
//     tenant participation
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY SCOPE
// -----------------------------------------------------------------------------

export const authorizationPolicyScopes = [
    "platform",
    "tenant",
] as const;

export type AuthorizationPolicyScope =
    (typeof authorizationPolicyScopes)[number];

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY LIFECYCLE STATUS
// -----------------------------------------------------------------------------

export const authorizationPolicyLifecycleStatuses = [
    "draft",
    "active",
    "archived",
] as const;

export type AuthorizationPolicyLifecycleStatus =
    (typeof authorizationPolicyLifecycleStatuses)[number];

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY EVALUATION RULES
// -----------------------------------------------------------------------------

export type AuthorizationPolicyEvaluationRules =
    Readonly<Record<string, unknown>>;

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY STATE
// -----------------------------------------------------------------------------

export interface AuthorizationPolicyState {
    /**
     * Stable Access-owned Policy identifier.
     */
    readonly policyId: string;

    /**
     * Human-readable Policy name.
     */
    readonly name: string;

    /**
     * Policy scope.
     *
     * Platform Policies protect Folksdo™ administration.
     * Tenant Policies constrain authorization inside one Tenant.
     */
    readonly scope: AuthorizationPolicyScope;

    /**
     * Tenant to which the Policy applies.
     *
     * Required only for Tenant Policies.
     */
    readonly tenantId?: string;

    /**
     * Current Policy version.
     *
     * Versions begin at one and increment on every successful update.
     */
    readonly version: number;

    /**
     * Current Policy lifecycle state.
     */
    readonly lifecycleStatus: AuthorizationPolicyLifecycleStatus;

    /**
     * Deterministic, replayable Policy evaluation rules.
     *
     * The authorization rule language is owned by the policy evaluation
     * boundary and must be validated before canonical state is committed.
     */
    readonly evaluationRules: AuthorizationPolicyEvaluationRules;

    /**
     * Identity or platform actor that created the Policy.
     */
    readonly createdBy: string;

    /**
     * Timestamp when the Policy was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the Policy was last changed.
     */
    readonly updatedAt: string;

    /**
     * Timestamp when the Policy became active.
     */
    readonly activatedAt?: string;

    /**
     * Timestamp when the Policy was archived.
     */
    readonly archivedAt?: string;

    /**
     * Identity or platform actor that archived the Policy.
     */
    readonly archivedBy?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY STATE GUARDS
// -----------------------------------------------------------------------------

export function isAuthorizationPolicyScope(
    value: unknown,
): value is AuthorizationPolicyScope {
    return (
        typeof value === "string"
        && authorizationPolicyScopes.includes(
            value as AuthorizationPolicyScope,
        )
    );
}

export function isAuthorizationPolicyLifecycleStatus(
    value: unknown,
): value is AuthorizationPolicyLifecycleStatus {
    return (
        typeof value === "string"
        && authorizationPolicyLifecycleStatuses.includes(
            value as AuthorizationPolicyLifecycleStatus,
        )
    );
}

export function isDraftAuthorizationPolicy(
    policy: AuthorizationPolicyState,
): boolean {
    return policy.lifecycleStatus === "draft";
}

export function isActiveAuthorizationPolicy(
    policy: AuthorizationPolicyState,
): boolean {
    return policy.lifecycleStatus === "active";
}

export function isArchivedAuthorizationPolicy(
    policy: AuthorizationPolicyState,
): boolean {
    return policy.lifecycleStatus === "archived";
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY OWNERSHIP GUARDS
// -----------------------------------------------------------------------------

export function authorizationPolicyRequiresTenant(
    scope: AuthorizationPolicyScope,
): boolean {
    return scope === "tenant";
}