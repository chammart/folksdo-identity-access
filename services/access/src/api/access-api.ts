// services/access/src/api/access-api.ts
// -----------------------------------------------------------------------------
// ACCESS API
// -----------------------------------------------------------------------------
// Provider-neutral application facade for Access Operations™.
//
// Purpose:
//   • expose one stable API surface to transport adapters
//   • keep Fastify route handlers thin
//   • centralize Access API operation composition
//   • preserve command/query dependency injection
//   • avoid coupling routes to concrete use-case classes
//
// Boundary:
//   • performs no HTTP request parsing
//   • performs no transport validation
//   • performs no authentication
//   • performs no direct persistence access
//   • contains no business lifecycle rules
//   • does not construct Folksdo Engine infrastructure
//
// Composition:
//
//   HTTP routes
//       ↓
//   AccessApi
//       ↓
//   operation handlers
//       ↓
//   use cases + read stores + API mappers
// -----------------------------------------------------------------------------

import type {
    AccessApi,
} from "./access-api-contracts";

// -----------------------------------------------------------------------------
// OPERATION HANDLER
// -----------------------------------------------------------------------------

/**
 * Extracts one operation contract from the complete Access API.
 *
 * Using the public API method itself as the source type prevents this facade
 * from redefining request, context or response contracts.
 */
export type AccessApiOperation<
    TOperation extends keyof AccessApi,
> = AccessApi[TOperation];

// -----------------------------------------------------------------------------
// API DEPENDENCIES
// -----------------------------------------------------------------------------

/**
 * Complete set of operation handlers required to expose Access Operations™.
 *
 * Runtime composition owns the implementation of these handlers. A handler
 * typically:
 *
 *   1. translates the public DTO into a use-case request
 *   2. executes the corresponding Access use case
 *   3. enriches the result through Access-owned read contracts when required
 *   4. maps the application result into its stable public DTO
 *
 * This structure avoids making the HTTP layer aware of concrete use-case
 * constructors or application result models.
 */
export interface CreateAccessApiDependencies {
    // -------------------------------------------------------------------------
    // PERMISSIONS
    // -------------------------------------------------------------------------

    readonly createPermission:
    AccessApiOperation<"createPermission">;

    readonly getPermission:
    AccessApiOperation<"getPermission">;

    readonly listPermissions:
    AccessApiOperation<"listPermissions">;

    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------

    readonly createRole:
    AccessApiOperation<"createRole">;

    readonly updateRole:
    AccessApiOperation<"updateRole">;

    readonly archiveRole:
    AccessApiOperation<"archiveRole">;

    readonly restoreRole:
    AccessApiOperation<"restoreRole">;

    readonly getRole:
    AccessApiOperation<"getRole">;

    readonly listRoles:
    AccessApiOperation<"listRoles">;

    // -------------------------------------------------------------------------
    // ROLE ASSIGNMENTS
    // -------------------------------------------------------------------------

    readonly assignRole:
    AccessApiOperation<"assignRole">;

    readonly removeRole:
    AccessApiOperation<"removeRole">;

    readonly listRoleAssignments:
    AccessApiOperation<"listRoleAssignments">;

    // -------------------------------------------------------------------------
    // PERMISSION ASSIGNMENTS
    // -------------------------------------------------------------------------

    readonly grantPermission:
    AccessApiOperation<"grantPermission">;

    readonly revokePermission:
    AccessApiOperation<"revokePermission">;

    readonly listPermissionAssignments:
    AccessApiOperation<"listPermissionAssignments">;

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICIES
    // -------------------------------------------------------------------------

    readonly createPolicy:
    AccessApiOperation<"createPolicy">;

    readonly updatePolicy:
    AccessApiOperation<"updatePolicy">;

    readonly archivePolicy:
    AccessApiOperation<"archivePolicy">;

    readonly listPolicies:
    AccessApiOperation<"listPolicies">;

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------

    readonly createRestriction:
    AccessApiOperation<"createRestriction">;

    readonly removeRestriction:
    AccessApiOperation<"removeRestriction">;

    readonly listRestrictions:
    AccessApiOperation<"listRestrictions">;

    // -------------------------------------------------------------------------
    // AUTHORIZATION
    // -------------------------------------------------------------------------

    readonly authorize:
    AccessApiOperation<"authorize">;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

/**
 * Creates the complete provider-neutral Access API facade.
 *
 * Each method is explicitly delegated rather than spreading the dependency
 * object. Explicit delegation:
 *
 *   • prevents accidental public exposure of future dependency fields
 *   • preserves method signatures from AccessApi
 *   • gives each operation a stable interception point
 *   • keeps the returned object structurally narrow
 */
export function createAccessApi(
    dependencies:
        CreateAccessApiDependencies,
): AccessApi {
    return {
        // ---------------------------------------------------------------------
        // PERMISSIONS
        // ---------------------------------------------------------------------

        createPermission: (
            request,
            context,
        ) =>
            dependencies.createPermission(
                request,
                context,
            ),

        getPermission: (
            permissionId,
            context,
        ) =>
            dependencies.getPermission(
                permissionId,
                context,
            ),

        listPermissions: (
            query,
            context,
        ) =>
            dependencies.listPermissions(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // ROLES
        // ---------------------------------------------------------------------

        createRole: (
            request,
            context,
        ) =>
            dependencies.createRole(
                request,
                context,
            ),

        updateRole: (
            request,
            context,
        ) =>
            dependencies.updateRole(
                request,
                context,
            ),

        archiveRole: (
            request,
            context,
        ) =>
            dependencies.archiveRole(
                request,
                context,
            ),

        restoreRole: (
            request,
            context,
        ) =>
            dependencies.restoreRole(
                request,
                context,
            ),

        getRole: (
            roleId,
            context,
        ) =>
            dependencies.getRole(
                roleId,
                context,
            ),

        listRoles: (
            query,
            context,
        ) =>
            dependencies.listRoles(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // ROLE ASSIGNMENTS
        // ---------------------------------------------------------------------

        assignRole: (
            request,
            context,
        ) =>
            dependencies.assignRole(
                request,
                context,
            ),

        removeRole: (
            request,
            context,
        ) =>
            dependencies.removeRole(
                request,
                context,
            ),

        listRoleAssignments: (
            query,
            context,
        ) =>
            dependencies.listRoleAssignments(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // PERMISSION ASSIGNMENTS
        // ---------------------------------------------------------------------

        grantPermission: (
            request,
            context,
        ) =>
            dependencies.grantPermission(
                request,
                context,
            ),

        revokePermission: (
            request,
            context,
        ) =>
            dependencies.revokePermission(
                request,
                context,
            ),

        listPermissionAssignments: (
            query,
            context,
        ) =>
            dependencies.listPermissionAssignments(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // AUTHORIZATION POLICIES
        // ---------------------------------------------------------------------

        createPolicy: (
            request,
            context,
        ) =>
            dependencies.createPolicy(
                request,
                context,
            ),

        updatePolicy: (
            request,
            context,
        ) =>
            dependencies.updatePolicy(
                request,
                context,
            ),

        archivePolicy: (
            request,
            context,
        ) =>
            dependencies.archivePolicy(
                request,
                context,
            ),

        listPolicies: (
            query,
            context,
        ) =>
            dependencies.listPolicies(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // ACCESS RESTRICTIONS
        // ---------------------------------------------------------------------

        createRestriction: (
            request,
            context,
        ) =>
            dependencies.createRestriction(
                request,
                context,
            ),

        removeRestriction: (
            request,
            context,
        ) =>
            dependencies.removeRestriction(
                request,
                context,
            ),

        listRestrictions: (
            query,
            context,
        ) =>
            dependencies.listRestrictions(
                query,
                context,
            ),

        // ---------------------------------------------------------------------
        // AUTHORIZATION
        // ---------------------------------------------------------------------

        authorize: (
            request,
            context,
        ) =>
            dependencies.authorize(
                request,
                context,
            ),
    };
}

// -----------------------------------------------------------------------------
// API TYPE GUARD
// -----------------------------------------------------------------------------

/**
 * Lightweight structural check intended for composition-time diagnostics.
 *
 * This is not request validation. It verifies that a runtime value exposes all
 * required Access API operations before it is registered with the HTTP host.
 */
export function isAccessApi(
    value: unknown,
): value is AccessApi {
    if (
        typeof value !== "object"
        || value === null
    ) {
        return false;
    }

    const candidate =
        value as Partial<
            Record<
                keyof AccessApi,
                unknown
            >
        >;

    return accessApiOperationNames.every(
        (
            operation,
        ) =>
            typeof candidate[
            operation
            ] === "function",
    );
}

// -----------------------------------------------------------------------------
// OPERATION NAMES
// -----------------------------------------------------------------------------

export const accessApiOperationNames = [
    "createPermission",
    "getPermission",
    "listPermissions",

    "createRole",
    "updateRole",
    "archiveRole",
    "restoreRole",
    "getRole",
    "listRoles",

    "assignRole",
    "removeRole",
    "listRoleAssignments",

    "grantPermission",
    "revokePermission",
    "listPermissionAssignments",

    "createPolicy",
    "updatePolicy",
    "archivePolicy",
    "listPolicies",

    "createRestriction",
    "removeRestriction",
    "listRestrictions",

    "authorize",
] as const satisfies readonly (
    keyof AccessApi
)[];