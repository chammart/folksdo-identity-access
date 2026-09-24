// services/access/src/authorization/tenant-administrative-permissions.ts
// -----------------------------------------------------------------------------
// TENANT ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for Tenant Operations™.
//
// Purpose:
//   • define stable Permission identifiers for protected Tenant actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent Tenant/server composition from constructing identifiers ad hoc
//   • distinguish Tenant-local authority from provider lifecycle authority
//
// Boundary:
//   • Access Operations™ owns the canonical Permission Catalog
//   • Tenant Operations™ declares which protected business action is required
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// TENANT ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type TenantAdministrativePermissionId =
    `tenant.${string}.${string}`;

// -----------------------------------------------------------------------------
// TENANT ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface TenantAdministrativePermission
    extends AccessPermissionRequest {
    readonly permissionId:
        TenantAdministrativePermissionId;

    readonly service:
        "tenant";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function defineTenantAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): TenantAdministrativePermission & {
    readonly permissionId:
        `tenant.${TResource}.${TAction}`;
    readonly service:
        "tenant";
    readonly resource:
        TResource;
    readonly action:
        TAction;
} {
    const permissionId =
        `tenant.${resource}.${action}` as
        `tenant.${TResource}.${TAction}`;

    return {
        permissionId,
        service:
            "tenant",
        resource,
        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL TENANT PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const TENANT_ADMINISTRATIVE_PERMISSIONS = {
    tenantCreate:
        defineTenantAdministrativePermission(
            "tenant",
            "create",
        ),

    tenantView:
        defineTenantAdministrativePermission(
            "tenant",
            "view",
        ),

    tenantList:
        defineTenantAdministrativePermission(
            "tenant",
            "list",
        ),

    profileUpdate:
        defineTenantAdministrativePermission(
            "profile",
            "update",
        ),

    lifecycleActivate:
        defineTenantAdministrativePermission(
            "lifecycle",
            "activate",
        ),

    lifecycleSuspend:
        defineTenantAdministrativePermission(
            "lifecycle",
            "suspend",
        ),

    lifecycleReactivate:
        defineTenantAdministrativePermission(
            "lifecycle",
            "reactivate",
        ),

    lifecycleArchive:
        defineTenantAdministrativePermission(
            "lifecycle",
            "archive",
        ),
} as const;

export type TenantAdministrativePermissionName =
    keyof typeof TENANT_ADMINISTRATIVE_PERMISSIONS;
