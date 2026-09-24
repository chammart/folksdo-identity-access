// services/access/src/api/access-routes.ts
// -----------------------------------------------------------------------------
// ACCESS ROUTES
// -----------------------------------------------------------------------------
// Canonical HTTP route definitions for Access Operations™.
//
// Purpose:
//   • define stable HTTP methods and paths
//   • centralize route identifiers
//   • prevent route strings from being duplicated across registration code
//   • keep Fastify-specific handler registration outside this file
//
// Boundary:
//   • contains no Fastify imports
//   • contains no request validation
//   • contains no authentication or authorization middleware
//   • contains no use-case execution
//   • contains no HTTP response translation
// -----------------------------------------------------------------------------

import type {
    AccessApi,
} from "./access-api-contracts";

// -----------------------------------------------------------------------------
// ROUTE PREFIX
// -----------------------------------------------------------------------------

export const ACCESS_API_PREFIX =
    "/api/v1/access" as const;

// -----------------------------------------------------------------------------
// HTTP METHODS
// -----------------------------------------------------------------------------

export type AccessHttpMethod =
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";

// -----------------------------------------------------------------------------
// ACCESS API OPERATION
// -----------------------------------------------------------------------------

export type AccessApiOperationName =
    keyof AccessApi;

// -----------------------------------------------------------------------------
// ROUTE DEFINITION
// -----------------------------------------------------------------------------

export interface AccessRouteDefinition<
    TOperation extends AccessApiOperationName =
    AccessApiOperationName,
> {
    /**
     * Stable internal identifier used for observability and route registration.
     */
    readonly routeId: string;

    /**
     * Public HTTP method.
     */
    readonly method: AccessHttpMethod;

    /**
     * Path relative to ACCESS_API_PREFIX.
     */
    readonly path: string;

    /**
     * Access API operation invoked by the route.
     */
    readonly operation: TOperation;

    /**
     * Successful HTTP status code.
     */
    readonly successStatusCode: number;

    /**
     * Indicates whether the route expects a JSON request body.
     */
    readonly hasBody: boolean;

    /**
     * Indicates whether the route accepts query-string parameters.
     */
    readonly hasQuery: boolean;

    /**
     * Indicates whether the route expects path parameters.
     */
    readonly hasParameters: boolean;
}

// -----------------------------------------------------------------------------
// PERMISSION ROUTES
// -----------------------------------------------------------------------------

export const createPermissionRoute = {
    routeId:
        "access.permission.create",

    method:
        "POST",

    path:
        "/permissions",

    operation:
        "createPermission",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"createPermission">;

export const getPermissionRoute = {
    routeId:
        "access.permission.get",

    method:
        "GET",

    path:
        "/permissions/:permissionId",

    operation:
        "getPermission",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"getPermission">;

export const listPermissionsRoute = {
    routeId:
        "access.permission.list",

    method:
        "GET",

    path:
        "/permissions",

    operation:
        "listPermissions",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listPermissions">;

// -----------------------------------------------------------------------------
// ROLE ROUTES
// -----------------------------------------------------------------------------

export const createRoleRoute = {
    routeId:
        "access.role.create",

    method:
        "POST",

    path:
        "/roles",

    operation:
        "createRole",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"createRole">;

export const getRoleRoute = {
    routeId:
        "access.role.get",

    method:
        "GET",

    path:
        "/roles/:roleId",

    operation:
        "getRole",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"getRole">;

export const listRolesRoute = {
    routeId:
        "access.role.list",

    method:
        "GET",

    path:
        "/roles",

    operation:
        "listRoles",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listRoles">;

export const updateRoleRoute = {
    routeId:
        "access.role.update",

    method:
        "PATCH",

    path:
        "/roles/:roleId",

    operation:
        "updateRole",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"updateRole">;

export const archiveRoleRoute = {
    routeId:
        "access.role.archive",

    method:
        "POST",

    path:
        "/roles/:roleId/archive",

    operation:
        "archiveRole",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"archiveRole">;

export const restoreRoleRoute = {
    routeId:
        "access.role.restore",

    method:
        "POST",

    path:
        "/roles/:roleId/restore",

    operation:
        "restoreRole",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"restoreRole">;

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT ROUTES
// -----------------------------------------------------------------------------

export const assignRoleRoute = {
    routeId:
        "access.role.assign",

    method:
        "POST",

    path:
        "/role-assignments",

    operation:
        "assignRole",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"assignRole">;

export const removeRoleRoute = {
    routeId:
        "access.role.remove",

    method:
        "POST",

    path:
        "/role-assignments/:assignmentId/remove",

    operation:
        "removeRole",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"removeRole">;

export const listRoleAssignmentsRoute = {
    routeId:
        "access.role-assignment.list",

    method:
        "GET",

    path:
        "/role-assignments",

    operation:
        "listRoleAssignments",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listRoleAssignments">;

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT ROUTES
// -----------------------------------------------------------------------------

export const grantPermissionRoute = {
    routeId:
        "access.permission.grant",

    method:
        "POST",

    path:
        "/permission-assignments",

    operation:
        "grantPermission",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"grantPermission">;

export const revokePermissionRoute = {
    routeId:
        "access.permission.revoke",

    method:
        "POST",

    path:
        "/permission-assignments/:assignmentId/revoke",

    operation:
        "revokePermission",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"revokePermission">;

export const listPermissionAssignmentsRoute = {
    routeId:
        "access.permission-assignment.list",

    method:
        "GET",

    path:
        "/permission-assignments",

    operation:
        "listPermissionAssignments",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listPermissionAssignments">;

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY ROUTES
// -----------------------------------------------------------------------------

export const createPolicyRoute = {
    routeId:
        "access.policy.create",

    method:
        "POST",

    path:
        "/policies",

    operation:
        "createPolicy",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"createPolicy">;

export const listPoliciesRoute = {
    routeId:
        "access.policy.list",

    method:
        "GET",

    path:
        "/policies",

    operation:
        "listPolicies",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listPolicies">;

export const updatePolicyRoute = {
    routeId:
        "access.policy.update",

    method:
        "PATCH",

    path:
        "/policies/:policyId",

    operation:
        "updatePolicy",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"updatePolicy">;

export const archivePolicyRoute = {
    routeId:
        "access.policy.archive",

    method:
        "POST",

    path:
        "/policies/:policyId/archive",

    operation:
        "archivePolicy",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"archivePolicy">;

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION ROUTES
// -----------------------------------------------------------------------------

export const createRestrictionRoute = {
    routeId:
        "access.restriction.create",

    method:
        "POST",

    path:
        "/restrictions",

    operation:
        "createRestriction",

    successStatusCode:
        201,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"createRestriction">;

export const removeRestrictionRoute = {
    routeId:
        "access.restriction.remove",

    method:
        "POST",

    path:
        "/restrictions/:restrictionId/remove",

    operation:
        "removeRestriction",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        true,
} as const satisfies AccessRouteDefinition<"removeRestriction">;

export const listRestrictionsRoute = {
    routeId:
        "access.restriction.list",

    method:
        "GET",

    path:
        "/restrictions",

    operation:
        "listRestrictions",

    successStatusCode:
        200,

    hasBody:
        false,

    hasQuery:
        true,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"listRestrictions">;

// -----------------------------------------------------------------------------
// AUTHORIZATION ROUTES
// -----------------------------------------------------------------------------

export const authorizeRoute = {
    routeId:
        "access.authorization.evaluate",

    method:
        "POST",

    path:
        "/authorize",

    operation:
        "authorize",

    successStatusCode:
        200,

    hasBody:
        true,

    hasQuery:
        false,

    hasParameters:
        false,
} as const satisfies AccessRouteDefinition<"authorize">;

// -----------------------------------------------------------------------------
// ROUTE GROUPS
// -----------------------------------------------------------------------------

export const accessPermissionRoutes = [
    createPermissionRoute,
    getPermissionRoute,
    listPermissionsRoute,
] as const;

export const accessRoleRoutes = [
    createRoleRoute,
    getRoleRoute,
    listRolesRoute,
    updateRoleRoute,
    archiveRoleRoute,
    restoreRoleRoute,
] as const;

export const accessRoleAssignmentRoutes = [
    assignRoleRoute,
    removeRoleRoute,
    listRoleAssignmentsRoute,
] as const;

export const accessPermissionAssignmentRoutes = [
    grantPermissionRoute,
    revokePermissionRoute,
    listPermissionAssignmentsRoute,
] as const;

export const accessPolicyRoutes = [
    createPolicyRoute,
    listPoliciesRoute,
    updatePolicyRoute,
    archivePolicyRoute,
] as const;

export const accessRestrictionRoutes = [
    createRestrictionRoute,
    removeRestrictionRoute,
    listRestrictionsRoute,
] as const;

export const accessAuthorizationRoutes = [
    authorizeRoute,
] as const;

// -----------------------------------------------------------------------------
// COMPLETE ROUTE CATALOG
// -----------------------------------------------------------------------------

export const accessRoutes = [
    ...accessPermissionRoutes,
    ...accessRoleRoutes,
    ...accessRoleAssignmentRoutes,
    ...accessPermissionAssignmentRoutes,
    ...accessPolicyRoutes,
    ...accessRestrictionRoutes,
    ...accessAuthorizationRoutes,
] as const satisfies readonly AccessRouteDefinition[];

// -----------------------------------------------------------------------------
// ROUTE LOOKUP
// -----------------------------------------------------------------------------

export function findAccessRoute(
    routeId: string,
): AccessRouteDefinition | undefined {
    return accessRoutes.find(
        (
            route,
        ) =>
            route.routeId === routeId,
    );
}

// -----------------------------------------------------------------------------
// COMPLETE ROUTE PATH
// -----------------------------------------------------------------------------

export function createAccessRoutePath(
    route: AccessRouteDefinition,
): string {
    return `${ACCESS_API_PREFIX}${route.path}`;
}