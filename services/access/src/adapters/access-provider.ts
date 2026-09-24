// services/access/src/adapters/access-provider.ts
// -----------------------------------------------------------------------------
// ACCESS PROVIDER
// -----------------------------------------------------------------------------
// Provider-neutral external authorization projection contract for
// Access Operations™.
//
// Purpose:
//   • define the Access-owned boundary for external authorization providers
//   • isolate BetterAuth and other provider SDKs from Access business packages
//   • allow supported Access state to be projected into external providers
//   • preserve Access Operations™ as the canonical authorization authority
//
// Boundary:
//   • owned by Access Operations™
//   • contains no BetterAuth imports
//   • contains no provider-specific types
//   • contains no authorization decision logic
//   • contains no persistence implementation
//
// Dependency direction:
//
//   Access application layer
//             ↓
//      AccessProvider
//             ↑
//   BetterAuth adapter
//             ↑
//      BetterAuth SDK
//
// Important:
//   • providers are projections, not sources of truth
//   • unsupported capabilities must be declared explicitly
//   • providers must not silently emulate unsupported Access semantics
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PROVIDER CAPABILITIES
// -----------------------------------------------------------------------------

export interface AccessProviderCapabilities {

    /**
     * Supports Tenant Role definition projection.
     */
    readonly tenantRoleSynchronization:
    boolean;

    /**
     * Supports assigning Tenant Roles to provider-owned Membership records.
     */
    readonly tenantRoleAssignmentSynchronization:
    boolean;

    /**
     * Supports Platform Role definition projection.
     */
    readonly platformRoleSynchronization:
    boolean;

    /**
     * Supports System Role definition projection.
     */
    readonly systemRoleSynchronization:
    boolean;

    /**
     * Supports standalone Permission catalog projection.
     */
    readonly permissionCatalogSynchronization:
    boolean;

    /**
     * Supports direct Permission grant and deny projection.
     */
    readonly directPermissionAssignmentSynchronization:
    boolean;

    /**
     * Supports provider-side authorization-state invalidation.
     */
    readonly authorizationStateInvalidation:
    boolean;
}

// -----------------------------------------------------------------------------
// PROVIDER DESCRIPTOR
// -----------------------------------------------------------------------------

export interface AccessProviderDescriptor {

    /**
     * Stable provider identifier.
     */
    readonly provider:
    string;

    /**
     * Human-readable provider name.
     */
    readonly displayName:
    string;

    /**
     * Capabilities supported by this implementation.
     */
    readonly capabilities:
    AccessProviderCapabilities;
}

// -----------------------------------------------------------------------------
// PROVIDER PERMISSION MAP
// -----------------------------------------------------------------------------

/**
 * Provider-neutral resource/action permission representation.
 *
 * Example:
 *
 * {
 *     project: [
 *         "create",
 *         "update",
 *     ],
 * }
 */
export type AccessProviderPermissionMap =
    Readonly<
        Record<
            string,
            readonly string[]
        >
    >;

// -----------------------------------------------------------------------------
// TENANT ROLE PROJECTION
// -----------------------------------------------------------------------------

export interface SynchronizeTenantRoleInput {

    /**
     * Stable Access-owned Role identifier.
     */
    readonly roleId:
    string;

    /**
     * Tenant that owns the Role.
     */
    readonly tenantId:
    string;

    /**
     * Canonical Access Role name.
     */
    readonly name:
    string;

    /**
     * Provider-ready effective Permission map for the Role.
     *
     * Access resolves Role permission membership before invoking the provider.
     * The provider adapter does not resolve effective Permissions.
     */
    readonly permissions:
    AccessProviderPermissionMap;
}

export interface RemoveTenantRoleInput {

    /**
     * Stable Access-owned Role identifier.
     */
    readonly roleId:
    string;

    /**
     * Tenant that owns the Role.
     */
    readonly tenantId:
    string;

    /**
     * Canonical Role name.
     *
     * Some providers identify dynamic Roles by name rather than by the
     * Access-owned Role identifier.
     */
    readonly name:
    string;
}

// -----------------------------------------------------------------------------
// TENANT ROLE ASSIGNMENT PROJECTION
// -----------------------------------------------------------------------------

export interface SynchronizeTenantRoleAssignmentsInput {

    /**
     * Tenant whose provider Membership Role set is being synchronized.
     */
    readonly tenantId:
    string;

    /**
     * Access Membership whose provider Role set is being synchronized.
     */
    readonly membershipId:
    string;

    /**
     * Global Identity associated with the Membership.
     */
    readonly identityId:
    string;

    /**
     * Complete desired Role-name set.
     *
     * This is a replacement projection rather than an incremental add/remove
     * command. Replacement semantics make retries deterministic and prevent
     * provider drift.
     */
    readonly roleNames:
    readonly string[];
}

// -----------------------------------------------------------------------------
// INVALIDATION
// -----------------------------------------------------------------------------

export interface InvalidateProviderAuthorizationStateInput {

    /**
     * Global Identity whose provider-owned authorization state is stale.
     */
    readonly identityId?:
    string;

    /**
     * Membership whose provider-owned authorization state is stale.
     */
    readonly membershipId?:
    string;

    /**
     * Tenant whose provider-owned authorization state is stale.
     */
    readonly tenantId?:
    string;

    /**
     * Stable invalidation reason.
     */
    readonly reason:
    string;
}

// -----------------------------------------------------------------------------
// OPERATION RESULT
// -----------------------------------------------------------------------------

export interface AccessProviderOperationResult {

    /**
     * Indicates whether provider state changed.
     */
    readonly changed:
    boolean;

    /**
     * Optional provider-owned diagnostic reference.
     */
    readonly providerReference?:
    string;
}

// -----------------------------------------------------------------------------
// ACCESS PROVIDER CONTRACT
// -----------------------------------------------------------------------------

/**
 * External authorization projection provider owned by Access Operations™.
 *
 * Implementations must be idempotent. Repeating an operation with the same
 * desired Access state must not create duplicate provider records.
 */
export interface AccessProvider {

    /**
     * Stable provider metadata and capability declaration.
     */
    readonly descriptor:
    AccessProviderDescriptor;

    /**
     * Creates or updates one Tenant Role projection.
     *
     * Implementations that declare tenantRoleSynchronization as false must
     * reject this operation explicitly.
     */
    synchronizeTenantRole(
        input: SynchronizeTenantRoleInput,
    ): Promise<AccessProviderOperationResult>;

    /**
     * Removes one Tenant Role projection.
     *
     * Removing provider state does not archive or remove the Access-owned Role.
     */
    removeTenantRole(
        input: RemoveTenantRoleInput,
    ): Promise<AccessProviderOperationResult>;

    /**
     * Replaces the provider Role set assigned to one Tenant Membership.
     *
     * Implementations that declare tenantRoleAssignmentSynchronization as
     * false must reject this operation explicitly.
     */
    synchronizeTenantRoleAssignments(
        input: SynchronizeTenantRoleAssignmentsInput,
    ): Promise<AccessProviderOperationResult>;

    /**
     * Invalidates provider-owned authorization state when supported.
     *
     * Implementations that declare authorizationStateInvalidation as false
     * must reject this operation explicitly.
     */
    invalidateAuthorizationState(
        input: InvalidateProviderAuthorizationStateInput,
    ): Promise<AccessProviderOperationResult>;
}