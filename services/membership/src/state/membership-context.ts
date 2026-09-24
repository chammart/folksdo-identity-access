// services/membership/src/state/membership-context.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT STATE
// -----------------------------------------------------------------------------
// Canonical Membership-owned state for active tenant execution context.
//
// Purpose:
//   • identify the tenant context in which an Identity is currently operating
//   • bind the active tenant context to a valid Membership
//   • support deterministic tenant switching
//   • provide the Membership contribution to runtime security context
//   • remain independent from Access-owned roles and permissions
//
// Boundary:
//   • Identity Operations™ establishes the authenticated Identity
//   • Membership Operations™ resolves the active tenant participation context
//   • Access Operations™ resolves authorization within that context
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT STATE
// -----------------------------------------------------------------------------

export interface MembershipContextState {
    /**
     * Global Identity for which tenant context is resolved.
     *
     * Membership context is unique per Identity.
     */
    readonly identityId: string;

    /**
     * Membership currently selected for execution.
     */
    readonly activeMembershipId: string;

    /**
     * Tenant associated with the active Membership.
     */
    readonly activeTenantId: string;

    /**
     * Timestamp when this Membership became the active execution context.
     */
    readonly activatedAt: string;

    /**
     * Timestamp when the active Membership context last changed.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// RESOLVED MEMBERSHIP CONTEXT
// -----------------------------------------------------------------------------

export interface ResolvedMembershipContext {
    /**
     * Authenticated global Identity.
     */
    readonly identityId: string;

    /**
     * Active Membership used for tenant execution.
     */
    readonly membershipId: string;

    /**
     * Tenant in which the Identity is operating.
     */
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT GUARDS
// -----------------------------------------------------------------------------

export function hasActiveMembershipContext(
    context: MembershipContextState | null | undefined,
): context is MembershipContextState {
    return (
        context !== null
        && context !== undefined
        && context.activeMembershipId.length > 0
        && context.activeTenantId.length > 0
    );
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT RESOLUTION
// -----------------------------------------------------------------------------

export function resolveMembershipContext(
    context: MembershipContextState,
): ResolvedMembershipContext {
    return {
        identityId: context.identityId,
        membershipId: context.activeMembershipId,
        tenantId: context.activeTenantId,
    };
}