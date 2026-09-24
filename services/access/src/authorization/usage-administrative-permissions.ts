// services/access/src/authorization/usage-administrative-permissions.ts
// -----------------------------------------------------------------------------
// USAGE ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Access Operations™ catalog entries for protected Usage Operations™ reads.
// -----------------------------------------------------------------------------

import type { AccessPermissionRequest } from "./access-permissions";

export type UsageAdministrativePermissionId = `usage.${string}.${string}`;

export interface UsageAdministrativePermission extends AccessPermissionRequest {
    readonly permissionId: UsageAdministrativePermissionId;
    readonly service: "usage";
}

function defineUsageAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(resource: TResource, action: TAction): UsageAdministrativePermission & {
    readonly permissionId: `usage.${TResource}.${TAction}`;
    readonly service: "usage";
    readonly resource: TResource;
    readonly action: TAction;
} {
    return {
        permissionId: `usage.${resource}.${action}` as `usage.${TResource}.${TAction}`,
        service: "usage",
        resource,
        action,
    };
}

export const USAGE_ADMINISTRATIVE_PERMISSIONS = {
    usageView: defineUsageAdministrativePermission("usage", "view"),
    usageList: defineUsageAdministrativePermission("usage", "list"),
    measurementView: defineUsageAdministrativePermission("measurement", "view"),
    measurementList: defineUsageAdministrativePermission("measurement", "list"),
    capacityView: defineUsageAdministrativePermission("capacity", "view"),
} as const;

export type UsageAdministrativePermissionName =
    keyof typeof USAGE_ADMINISTRATIVE_PERMISSIONS;
