// services/access/src/authorization/access-administrative-permissions.ts
// -----------------------------------------------------------------------------
// ACCESS ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for administration of Access
// Operations™ itself.
//
// Purpose:
//   • define stable Permission identifiers for Access administrative actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent routes and runtime composition from constructing Permission
//     identifiers ad hoc
//   • keep administrative Permission vocabulary independent from HTTP
//
// Boundary:
//   • contains Permission definitions only
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
//   • contains no wildcard administrative authority
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type AccessAdministrativePermissionId =
    `access.${string}.${string}`;

// -----------------------------------------------------------------------------
// ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface AccessAdministrativePermission
    extends AccessPermissionRequest {
    /**
     * Canonical business identifier used by the Permission Catalog and
     * deterministic certification fixtures.
     */
    readonly permissionId:
    AccessAdministrativePermissionId;

    readonly service:
    "access";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function defineAccessAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): AccessAdministrativePermission & {
    readonly permissionId:
    `access.${TResource}.${TAction}`;
    readonly service:
    "access";
    readonly resource:
    TResource;
    readonly action:
    TAction;
} {
    const permissionId =
        `access.${resource}.${action}` as
        `access.${TResource}.${TAction}`;

    return {
        permissionId,
        service:
            "access",
        resource,
        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL ADMINISTRATIVE PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const ACCESS_ADMINISTRATIVE_PERMISSIONS = {
    // -------------------------------------------------------------------------
    // PERMISSION CATALOG
    // -------------------------------------------------------------------------

    permissionCreate:
        defineAccessAdministrativePermission(
            "permission",
            "create",
        ),

    permissionView:
        defineAccessAdministrativePermission(
            "permission",
            "view",
        ),

    permissionList:
        defineAccessAdministrativePermission(
            "permission",
            "list",
        ),

    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------

    roleCreate:
        defineAccessAdministrativePermission(
            "role",
            "create",
        ),

    roleView:
        defineAccessAdministrativePermission(
            "role",
            "view",
        ),

    roleList:
        defineAccessAdministrativePermission(
            "role",
            "list",
        ),

    roleUpdate:
        defineAccessAdministrativePermission(
            "role",
            "update",
        ),

    roleArchive:
        defineAccessAdministrativePermission(
            "role",
            "archive",
        ),

    roleRestore:
        defineAccessAdministrativePermission(
            "role",
            "restore",
        ),

    roleAssign:
        defineAccessAdministrativePermission(
            "role",
            "assign",
        ),

    roleRemove:
        defineAccessAdministrativePermission(
            "role",
            "remove",
        ),

    roleAssignmentList:
        defineAccessAdministrativePermission(
            "role-assignment",
            "list",
        ),

    // -------------------------------------------------------------------------
    // DIRECT PERMISSION ASSIGNMENTS
    // -------------------------------------------------------------------------

    permissionGrant:
        defineAccessAdministrativePermission(
            "permission",
            "grant",
        ),

    permissionRevoke:
        defineAccessAdministrativePermission(
            "permission",
            "revoke",
        ),

    permissionAssignmentList:
        defineAccessAdministrativePermission(
            "permission-assignment",
            "list",
        ),

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICIES
    // -------------------------------------------------------------------------

    policyCreate:
        defineAccessAdministrativePermission(
            "policy",
            "create",
        ),

    policyList:
        defineAccessAdministrativePermission(
            "policy",
            "list",
        ),

    policyUpdate:
        defineAccessAdministrativePermission(
            "policy",
            "update",
        ),

    policyArchive:
        defineAccessAdministrativePermission(
            "policy",
            "archive",
        ),

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------

    restrictionCreate:
        defineAccessAdministrativePermission(
            "restriction",
            "create",
        ),

    restrictionRemove:
        defineAccessAdministrativePermission(
            "restriction",
            "remove",
        ),

    restrictionList:
        defineAccessAdministrativePermission(
            "restriction",
            "list",
        ),
} as const;

// -----------------------------------------------------------------------------
// ADMINISTRATIVE PERMISSION NAME
// -----------------------------------------------------------------------------

export type AccessAdministrativePermissionName =
    keyof typeof ACCESS_ADMINISTRATIVE_PERMISSIONS;