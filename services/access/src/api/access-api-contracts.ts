// services/access/src/api/access-api-contracts.ts
// -----------------------------------------------------------------------------
// ACCESS API CONTRACTS
// -----------------------------------------------------------------------------
// Provider-neutral public API contracts for Access Operations™.
//
// Purpose:
//   • define the transport-facing Access API facade
//   • keep Fastify and HTTP concerns outside application use cases
//   • expose stable request, response and execution-context contracts
//   • preserve Identity → Membership → Access dependency direction
//
// Boundary:
//   • contains no route registration
//   • contains no request validation implementation
//   • contains no HTTP status-code or error translation logic
//   • contains no persistence or Folksdo Engine construction
//   • does not expose canonical persistence state
// -----------------------------------------------------------------------------

import type {
    ApiArchivePolicyRequest,
    ApiArchiveRoleRequest,
    ApiAssignRoleRequest,
    AuthorizationDecisionDto,
    AuthorizationPolicyDto,
    AuthorizeRequest,
    ApiCreatePermissionRequest,
    ApiCreatePolicyRequest,
    ApiCreateRestrictionRequest,
    ApiCreateRoleRequest,
    ApiGrantPermissionRequest,
    ListPermissionAssignmentsQuery,
    ListPermissionsQuery,
    ListPoliciesQuery,
    ListRestrictionsQuery,
    ListRoleAssignmentsQuery,
    ListRolesQuery,
    PermissionAssignmentDto,
    PermissionDto,
    ApiRemoveRestrictionRequest,
    ApiRemoveRoleRequest,
    ApiRestoreRoleRequest,
    ApiRevokePermissionRequest,
    RoleAssignmentDto,
    RoleDto,
    AccessRestrictionDto,
    ApiUpdatePolicyRequest,
    ApiUpdateRoleRequest,
} from "./dto";

// -----------------------------------------------------------------------------
// ACTOR TYPE
// -----------------------------------------------------------------------------

/**
 * Stable actor categories accepted by the Access HTTP boundary.
 *
 * The API does not authenticate these actors. Identity Operations™ and the
 * Operations host resolve the authenticated actor before invoking Access.
 */
export type AccessApiActorType =
    | "identity"
    | "service"
    | "system"
    | "platform";

// -----------------------------------------------------------------------------
// TENANT TYPE
// -----------------------------------------------------------------------------

export type AccessApiTenantType =
    | "tenant"
    | "platform";

// -----------------------------------------------------------------------------
// REQUEST CONTEXT
// -----------------------------------------------------------------------------

/**
 * Authenticated and correlated execution context supplied by the host.
 *
 * This context is transport-neutral and intentionally avoids leaking Fastify,
 * BetterAuth or concrete Folksdo Engine runtime types into the Access API
 * contract.
 */
export interface AccessApiRequestContext {
    /**
     * Unique identifier for the inbound request.
     */
    readonly requestId: string;

    /**
     * Identifier shared across all operations belonging to the same logical
     * workflow.
     */
    readonly correlationId: string;

    /**
     * Identifier of the operation or event that caused this request.
     */
    readonly causationId?: string;

    /**
     * Authenticated actor invoking the Access operation.
     */
    readonly actor: {
        readonly actorId: string;

        readonly actorType:
        AccessApiActorType;
    };

    /**
     * Active tenant execution context resolved by Membership Operations™.
     *
     * Platform-level Access operations may intentionally omit tenant context.
     */
    readonly tenant?: {
        readonly tenantId: string;

        readonly tenantType:
        AccessApiTenantType;
    };

    /**
     * Active Membership selected by Membership Operations™ for this request.
     *
     * Administrative authorization uses this trusted Membership identity as
     * the authorization subject. Caller-supplied Membership identifiers are
     * never administrative authority.
     */
    readonly membershipId?: string;

    /**
     * Legacy compatibility field.
     *
     * Runtime-provided permission arrays are not authorization authority for
     * Access administration. Administrative operations are authorized through
     * Access's deterministic evaluator.
     */
    readonly permissions?:
    readonly string[];

    /**
     * Explicit trusted internal execution boundary.
     *
     * This marker is created only by non-public host composition for
     * Security Foundation™ bootstrap workflows. Public HTTP context resolvers
     * must never populate it. It is not caller-supplied authorization
     * authority and must not be derived from request headers.
     */
    readonly trustedExecution?: {
        readonly boundary:
        "security_foundation";
    };
}

// -----------------------------------------------------------------------------
// IDENTIFIER PARAMETERS
// -----------------------------------------------------------------------------

export interface AccessPermissionIdParameters {
    readonly permissionId: string;
}

export interface AccessRoleIdParameters {
    readonly roleId: string;
}

export interface AccessRoleAssignmentIdParameters {
    readonly assignmentId: string;
}

export interface AccessPermissionAssignmentIdParameters {
    readonly assignmentId: string;
}

export interface AccessPolicyIdParameters {
    readonly policyId: string;
}

export interface AccessRestrictionIdParameters {
    readonly restrictionId: string;
}

export interface AccessMembershipIdParameters {
    readonly membershipId: string;
}

// -----------------------------------------------------------------------------
// PAGED RESPONSE
// -----------------------------------------------------------------------------

/**
 * Stable API collection response.
 *
 * Offset and limit mirror the currently defined Access query DTOs. The API
 * facade remains independent from database cursor implementation details.
 */
export interface AccessApiCollection<T> {
    readonly items:
    readonly T[];

    readonly limit?: number;

    readonly offset?: number;

    /**
     * Number of items returned in this response.
     */
    readonly count: number;

    /**
     * Total may be omitted when the read-store implementation does not perform
     * an additional count query.
     */
    readonly total?: number;
}

// -----------------------------------------------------------------------------
// PERMISSION API
// -----------------------------------------------------------------------------

export interface AccessPermissionApi {
    createPermission(
        request: ApiCreatePermissionRequest,
        context: AccessApiRequestContext,
    ): Promise<PermissionDto>;

    getPermission(
        permissionId: string,
        context: AccessApiRequestContext,
    ): Promise<PermissionDto>;

    listPermissions(
        query: ListPermissionsQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<PermissionDto>
    >;
}

// -----------------------------------------------------------------------------
// ROLE API
// -----------------------------------------------------------------------------

export interface AccessRoleApi {
    createRole(
        request: ApiCreateRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleDto>;

    updateRole(
        request: ApiUpdateRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleDto>;

    archiveRole(
        request: ApiArchiveRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleDto>;

    restoreRole(
        request: ApiRestoreRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleDto>;

    getRole(
        roleId: string,
        context: AccessApiRequestContext,
    ): Promise<RoleDto>;

    listRoles(
        query: ListRolesQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<RoleDto>
    >;
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT API
// -----------------------------------------------------------------------------

export interface AccessRoleAssignmentApi {
    assignRole(
        request: ApiAssignRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleAssignmentDto>;

    removeRole(
        request: ApiRemoveRoleRequest,
        context: AccessApiRequestContext,
    ): Promise<RoleAssignmentDto>;

    listRoleAssignments(
        query: ListRoleAssignmentsQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<RoleAssignmentDto>
    >;
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT API
// -----------------------------------------------------------------------------

export interface AccessPermissionAssignmentApi {
    grantPermission(
        request: ApiGrantPermissionRequest,
        context: AccessApiRequestContext,
    ): Promise<PermissionAssignmentDto>;

    revokePermission(
        request: ApiRevokePermissionRequest,
        context: AccessApiRequestContext,
    ): Promise<PermissionAssignmentDto>;

    listPermissionAssignments(
        query: ListPermissionAssignmentsQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<PermissionAssignmentDto>
    >;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY API
// -----------------------------------------------------------------------------

export interface AccessPolicyApi {
    createPolicy(
        request: ApiCreatePolicyRequest,
        context: AccessApiRequestContext,
    ): Promise<AuthorizationPolicyDto>;

    updatePolicy(
        request: ApiUpdatePolicyRequest,
        context: AccessApiRequestContext,
    ): Promise<AuthorizationPolicyDto>;

    archivePolicy(
        request: ApiArchivePolicyRequest,
        context: AccessApiRequestContext,
    ): Promise<AuthorizationPolicyDto>;

    listPolicies(
        query: ListPoliciesQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<AuthorizationPolicyDto>
    >;
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION API
// -----------------------------------------------------------------------------

export interface AccessRestrictionApi {
    createRestriction(
        request: ApiCreateRestrictionRequest,
        context: AccessApiRequestContext,
    ): Promise<AccessRestrictionDto>;

    removeRestriction(
        request: ApiRemoveRestrictionRequest,
        context: AccessApiRequestContext,
    ): Promise<AccessRestrictionDto>;

    listRestrictions(
        query: ListRestrictionsQuery,
        context: AccessApiRequestContext,
    ): Promise<
        AccessApiCollection<AccessRestrictionDto>
    >;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION API
// -----------------------------------------------------------------------------

export interface AccessAuthorizationApi {
    authorize(
        request: AuthorizeRequest,
        context: AccessApiRequestContext,
    ): Promise<AuthorizationDecisionDto>;
}

// -----------------------------------------------------------------------------
// COMPLETE ACCESS API
// -----------------------------------------------------------------------------

/**
 * Complete public Access Operations™ facade.
 *
 * Routes depend only on this interface. Concrete use cases, read stores,
 * authorization evaluators and provider adapters are composed behind its
 * implementation.
 */
export interface AccessApi
    extends
    AccessPermissionApi,
    AccessRoleApi,
    AccessRoleAssignmentApi,
    AccessPermissionAssignmentApi,
    AccessPolicyApi,
    AccessRestrictionApi,
    AccessAuthorizationApi { }

// -----------------------------------------------------------------------------
// CONTEXT RESOLVER
// -----------------------------------------------------------------------------

/**
 * Transport host boundary used by Access routes to obtain the authenticated
 * actor and active tenant execution context.
 *
 * Fastify-specific request types remain outside this contract by using a
 * generic transport request parameter.
 */
export interface AccessApiContextResolver<
    TTransportRequest = unknown,
> {
    resolve(
        request: TTransportRequest,
    ): Promise<AccessApiRequestContext>;
}

// -----------------------------------------------------------------------------
// API FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessApiInput {
    readonly api: AccessApi;
}