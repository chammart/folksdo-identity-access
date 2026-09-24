// services/access/src/authorization/provider-control-plane-administrative-permissions.ts
// -----------------------------------------------------------------------------
// PROVIDER CONTROL PLANE ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Access Operations™ catalog entries for protected Provider Control Plane™
// operational application reads.
// -----------------------------------------------------------------------------

import type { AccessPermissionRequest } from "./access-permissions";

export type ProviderControlPlaneAdministrativePermissionId =
    `provider-control-plane.${string}.${string}`;

export interface ProviderControlPlaneAdministrativePermission
extends AccessPermissionRequest {
    readonly permissionId: ProviderControlPlaneAdministrativePermissionId;
    readonly service: "provider-control-plane";
}

function defineProviderControlPlaneAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): ProviderControlPlaneAdministrativePermission & {
    readonly permissionId:
    `provider-control-plane.${TResource}.${TAction}`;
    readonly service: "provider-control-plane";
    readonly resource: TResource;
    readonly action: TAction;
} {
    return {
        permissionId:
            `provider-control-plane.${resource}.${action}` as
            `provider-control-plane.${TResource}.${TAction}`,
        service:
            "provider-control-plane",
        resource,
        action,
    };
}

export const PROVIDER_CONTROL_PLANE_ADMINISTRATIVE_PERMISSIONS = {
    searchRead:
        defineProviderControlPlaneAdministrativePermission(
            "search",
            "read",
        ),

    overviewRead:
        defineProviderControlPlaneAdministrativePermission(
            "overview",
            "read",
        ),

    attentionRead:
        defineProviderControlPlaneAdministrativePermission(
            "attention",
            "read",
        ),

    analyticsRead:
        defineProviderControlPlaneAdministrativePermission(
            "analytics",
            "read",
        ),
} as const;

export type ProviderControlPlaneAdministrativePermissionName =
    keyof typeof PROVIDER_CONTROL_PLANE_ADMINISTRATIVE_PERMISSIONS;
