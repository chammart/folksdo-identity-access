// services/access/src/authorization/platform-audit-administrative-permissions.ts
// -----------------------------------------------------------------------------
// PLATFORM AUDIT ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Access Operations™ catalog entries for protected Platform Audit™ reads.
// -----------------------------------------------------------------------------

import type { AccessPermissionRequest } from "./access-permissions";

export type PlatformAuditAdministrativePermissionId = `audit.${string}.${string}`;

export interface PlatformAuditAdministrativePermission extends AccessPermissionRequest {
    readonly permissionId: PlatformAuditAdministrativePermissionId;
    readonly service: "audit";
}

function definePlatformAuditAdministrativePermission<TResource extends string, TAction extends string>(resource: TResource, action: TAction): PlatformAuditAdministrativePermission & {
    readonly permissionId: `audit.${TResource}.${TAction}`;
    readonly service: "audit";
    readonly resource: TResource;
    readonly action: TAction;
} {
    return { permissionId: `audit.${resource}.${action}` as `audit.${TResource}.${TAction}`, service: "audit", resource, action };
}

export const PLATFORM_AUDIT_ADMINISTRATIVE_PERMISSIONS = {
    recordView: definePlatformAuditAdministrativePermission("record", "view"),
    recordList: definePlatformAuditAdministrativePermission("record", "list"),
    timelineView: definePlatformAuditAdministrativePermission("timeline", "view"),
    actorActivityView: definePlatformAuditAdministrativePermission("actor-activity", "view"),
    resourceHistoryView: definePlatformAuditAdministrativePermission("resource-history", "view"),
    correlationView: definePlatformAuditAdministrativePermission("correlation", "view"),
} as const;

export type PlatformAuditAdministrativePermissionName = keyof typeof PLATFORM_AUDIT_ADMINISTRATIVE_PERMISSIONS;
