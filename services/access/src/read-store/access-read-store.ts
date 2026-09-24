// services/access/src/read-store/access-read-store.ts
// -----------------------------------------------------------------------------
// ACCESS READ STORE
// -----------------------------------------------------------------------------
// Provider-neutral query contract for Access Operations™.
//
// Boundary:
//   • exposes business-driven Access queries
//   • returns canonical Access state and persisted known facts
//   • supports deterministic provider-neutral pagination
//   • supports complete authorization-state resolution
//   • exposes no MongoDB types, filters, cursors or collection details
// -----------------------------------------------------------------------------

import type {
    KnownIdentity,
    KnownMembership,
    KnownSubscriptionCapabilities,
    KnownTenant,
} from "../known-facts";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../state";

// -----------------------------------------------------------------------------
// PAGINATION
// -----------------------------------------------------------------------------

export interface AccessPageRequest {
    /**
     * Maximum number of records requested by the caller.
     *
     * The implementation may enforce a lower maximum.
     */
    readonly limit?: number;

    /**
     * Opaque continuation token returned by a preceding page.
     */
    readonly cursor?: string;
}

export interface AccessPage<T> {
    /**
     * Records contained in the current page.
     */
    readonly items: readonly T[];

    /**
     * Opaque continuation token.
     *
     * Undefined means that no additional page exists.
     */
    readonly nextCursor?: string;
}

// -----------------------------------------------------------------------------
// PAGED QUERY INPUTS
// -----------------------------------------------------------------------------

export interface ListPermissionsPageInput
    extends AccessPageRequest { }

export interface ListRolesPageInput
    extends AccessPageRequest {
    readonly tenantId?: string;
}

export interface ListRoleAssignmentsPageInput
    extends AccessPageRequest {
    readonly membershipId?: string;
    readonly identityId?: string;
}

export interface ListPermissionAssignmentsPageInput
    extends AccessPageRequest {
    readonly membershipId?: string;
    readonly identityId?: string;
}

export interface ListPoliciesPageInput
    extends AccessPageRequest {
    readonly tenantId?: string;
}

export interface ListRestrictionsPageInput
    extends AccessPageRequest {
    readonly tenantId?: string;
}

export interface ListKnownMembershipsPageInput
    extends AccessPageRequest {
    readonly identityId?: string;
    readonly tenantId?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION LOOKUP
// -----------------------------------------------------------------------------

export interface AuthorizationLookupInput {
    readonly identityId: string;
    readonly membershipId?: string;
    readonly tenantId?: string;
}

export interface AuthorizationLookupState {
    readonly roleAssignments:
    readonly RoleAssignmentState[];

    readonly permissionAssignments:
    readonly PermissionAssignmentState[];

    readonly policies:
    readonly AuthorizationPolicyState[];

    readonly restrictions:
    readonly AccessRestrictionState[];
}

// -----------------------------------------------------------------------------
// READ STORE
// -----------------------------------------------------------------------------

export interface AccessQueryReadStore {
    // -------------------------------------------------------------------------
    // PERMISSIONS
    // -------------------------------------------------------------------------

    findPermissionById(
        permissionId: string,
    ): Promise<PermissionState | null>;

    findPermissionByKey(
        service: string,
        resource: string,
        action: string,
    ): Promise<PermissionState | null>;

    findPermissionsByIds(
        permissionIds: readonly string[],
    ): Promise<readonly PermissionState[]>;

    /**
     * Complete deterministic list used by internal application queries.
     */
    listPermissions():
        Promise<readonly PermissionState[]>;

    /**
     * Bounded deterministic page used by public APIs and administrative reads.
     */
    listPermissionsPage(
        input?: ListPermissionsPageInput,
    ): Promise<AccessPage<PermissionState>>;

    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------

    findRoleById(
        roleId: string,
    ): Promise<RoleState | null>;

    findRoleByName(
        name: string,
        tenantId?: string,
    ): Promise<RoleState | null>;

    findRolesByIds(
        roleIds: readonly string[],
    ): Promise<readonly RoleState[]>;

    /**
     * Complete deterministic list used by internal application queries.
     */
    listRoles(
        tenantId?: string,
    ): Promise<readonly RoleState[]>;

    /**
     * Bounded deterministic page used by public APIs and administrative reads.
     */
    listRolesPage(
        input?: ListRolesPageInput,
    ): Promise<AccessPage<RoleState>>;

    // -------------------------------------------------------------------------
    // ROLE ASSIGNMENTS
    // -------------------------------------------------------------------------

    findRoleAssignmentById(
        assignmentId: string,
    ): Promise<RoleAssignmentState | null>;

    listRoleAssignments(
        membershipId?: string,
        identityId?: string,
    ): Promise<readonly RoleAssignmentState[]>;

    listRoleAssignmentsPage(
        input?: ListRoleAssignmentsPageInput,
    ): Promise<AccessPage<RoleAssignmentState>>;

    // -------------------------------------------------------------------------
    // PERMISSION ASSIGNMENTS
    // -------------------------------------------------------------------------

    findPermissionAssignmentById(
        assignmentId: string,
    ): Promise<PermissionAssignmentState | null>;

    listPermissionAssignments(
        membershipId?: string,
        identityId?: string,
    ): Promise<readonly PermissionAssignmentState[]>;

    listPermissionAssignmentsPage(
        input?: ListPermissionAssignmentsPageInput,
    ): Promise<AccessPage<PermissionAssignmentState>>;

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICIES
    // -------------------------------------------------------------------------

    findPolicyById(
        policyId: string,
    ): Promise<AuthorizationPolicyState | null>;

    listPolicies(
        tenantId?: string,
    ): Promise<readonly AuthorizationPolicyState[]>;

    listPoliciesPage(
        input?: ListPoliciesPageInput,
    ): Promise<AccessPage<AuthorizationPolicyState>>;

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------

    findRestrictionById(
        restrictionId: string,
    ): Promise<AccessRestrictionState | null>;

    listRestrictions(
        tenantId?: string,
    ): Promise<readonly AccessRestrictionState[]>;

    listRestrictionsPage(
        input?: ListRestrictionsPageInput,
    ): Promise<AccessPage<AccessRestrictionState>>;

    // -------------------------------------------------------------------------
    // KNOWN IDENTITIES
    // -------------------------------------------------------------------------

    findKnownIdentity(
        identityId: string,
    ): Promise<KnownIdentity | null>;

    findKnownMembership(
        membershipId: string,
    ): Promise<KnownMembership | null>;

    findKnownTenant(
        tenantId: string,
    ): Promise<KnownTenant | null>;

    findKnownSubscriptionCapabilities(
        tenantId: string,
    ): Promise<KnownSubscriptionCapabilities | null>;

    // -------------------------------------------------------------------------
    // KNOWN MEMBERSHIPS
    // -------------------------------------------------------------------------

    listKnownMemberships(
        identityId?: string,
        tenantId?: string,
    ): Promise<readonly KnownMembership[]>;

    listKnownMembershipsPage(
        input?: ListKnownMembershipsPageInput,
    ): Promise<AccessPage<KnownMembership>>;

    // -------------------------------------------------------------------------
    // AUTHORIZATION
    // -------------------------------------------------------------------------

    /**
     * Loads the complete active state applicable to an authorization decision.
     *
     * This method is intentionally not paginated. Authorization evaluation
     * must receive every applicable assignment, policy and restriction.
     */
    loadAuthorizationState(
        input: AuthorizationLookupInput,
    ): Promise<AuthorizationLookupState>;
}