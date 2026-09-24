// services/access/src/api/dto/authorize-request.ts
// -----------------------------------------------------------------------------
// AUTHORIZE REQUEST
// -----------------------------------------------------------------------------
// Transport-safe request for an Access authorization decision.
//
// Access determines whether the authenticated actor may perform the requested
// action against the protected resource in the supplied execution context.
//
// Boundary:
//   • actor identity is derived from trusted authentication context
//   • Membership and Tenant context may be supplied after trusted resolution
//   • request attributes are untrusted inputs and must be validated
// -----------------------------------------------------------------------------

export interface AuthorizeRequest {
    /**
     * Requested protected business action.
     *
     * Example:
     *   membership.read
     *   tenant.update
     */
    readonly action: string;

    readonly resource: AuthorizeResourceRequest;

    /**
     * Active Membership context resolved before authorization.
     */
    readonly membershipId?: string;

    /**
     * Active Tenant context resolved before authorization.
     */
    readonly tenantId?: string;

    /**
     * Additional policy-evaluation attributes.
     *
     * Values must remain JSON-compatible.
     */
    readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface AuthorizeResourceRequest {
    readonly type: string;

    readonly id?: string;

    /**
     * Optional resource attributes used by authorization policies.
     *
     * The API must not treat these values as canonical resource state unless
     * they originate from a trusted server-side resolver.
     */
    readonly attributes?: Readonly<Record<string, unknown>>;
}