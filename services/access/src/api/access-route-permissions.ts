// services/access/src/api/access-route-permissions.ts
// -----------------------------------------------------------------------------
// ACCESS ROUTE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical mapping from Access administrative API operations to the Access
// Permission required to execute them.
//
// Purpose:
//   • make administrative authorization requirements explicit and complete
//   • prevent route handlers from constructing Permission requests ad hoc
//   • keep /authorize outside administrative self-authorization
//   • provide one stable mapping consumed by later route/API hardening
//
// Boundary:
//   • maps provider-neutral Access API operation names only
//   • contains no authorization evaluation
//   • contains no route middleware or Fastify logic
//   • contains no persistence or runtime composition
// -----------------------------------------------------------------------------

import {
    ACCESS_ADMINISTRATIVE_PERMISSIONS,
    type AccessAdministrativePermission,
} from "../authorization";

import type {
    AccessApi,
} from "./access-api-contracts";

// -----------------------------------------------------------------------------
// ADMINISTRATIVE OPERATION NAME
// -----------------------------------------------------------------------------

/**
 * Every public Access operation except authorization evaluation administers
 * Access-owned state or exposes protected Access administration state.
 *
 * /authorize is intentionally excluded. Requiring an administrative
 * Permission to evaluate authorization would create recursive authorization.
 */
export type AccessAdministrativeOperationName =
    Exclude<
        keyof AccessApi,
        "authorize"
    >;

// -----------------------------------------------------------------------------
// ROUTE PERMISSION MAP
// -----------------------------------------------------------------------------

export const ACCESS_ROUTE_PERMISSIONS = {
    // -------------------------------------------------------------------------
    // PERMISSION CATALOG
    // -------------------------------------------------------------------------

    createPermission:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionCreate,

    getPermission:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionView,

    listPermissions:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionList,

    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------

    createRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleCreate,

    getRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleView,

    listRoles:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleList,

    updateRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleUpdate,

    archiveRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleArchive,

    restoreRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleRestore,

    // -------------------------------------------------------------------------
    // ROLE ASSIGNMENTS
    // -------------------------------------------------------------------------

    assignRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleAssign,

    removeRole:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleRemove,

    listRoleAssignments:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.roleAssignmentList,

    // -------------------------------------------------------------------------
    // DIRECT PERMISSION ASSIGNMENTS
    // -------------------------------------------------------------------------

    grantPermission:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionGrant,

    revokePermission:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionRevoke,

    listPermissionAssignments:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.permissionAssignmentList,

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICIES
    // -------------------------------------------------------------------------

    createPolicy:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.policyCreate,

    listPolicies:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.policyList,

    updatePolicy:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.policyUpdate,

    archivePolicy:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.policyArchive,

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------

    createRestriction:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.restrictionCreate,

    removeRestriction:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.restrictionRemove,

    listRestrictions:
        ACCESS_ADMINISTRATIVE_PERMISSIONS.restrictionList,
} as const satisfies Record<
    AccessAdministrativeOperationName,
    AccessAdministrativePermission
>;

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export function getAccessRoutePermission(
    operation:
        AccessAdministrativeOperationName,
): AccessAdministrativePermission {
    return ACCESS_ROUTE_PERMISSIONS[
        operation
    ];
}
