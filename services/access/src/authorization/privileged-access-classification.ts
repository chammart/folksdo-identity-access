// services/access/src/authorization/privileged-access-classification.ts
// -----------------------------------------------------------------------------
// PRIVILEGED ACCESS CLASSIFICATION
// -----------------------------------------------------------------------------
// Provider-owned policy identifying consequential IAM authority.
// Classification is deliberately separate from Permission.classification,
// which already represents platform/tenant catalog scope.
// -----------------------------------------------------------------------------

import type { PermissionState, RoleState } from "../state";

const PRIVILEGED_ACCESS_PERMISSION_IDS = new Set<string>([
    "access.permission.create",
    "access.permission.grant",
    "access.permission.revoke",
    "access.role.create",
    "access.role.update",
    "access.role.archive",
    "access.role.restore",
    "access.role.assign",
    "access.role.remove",
    "access.policy.create",
    "access.policy.update",
    "access.policy.archive",
    "access.restriction.create",
    "access.restriction.remove",
]);

export function isPrivilegedPermission(permission: Pick<PermissionState, "permissionId">): boolean {
    return PRIVILEGED_ACCESS_PERMISSION_IDS.has(permission.permissionId);
}

export function isPrivilegedRole(role: Pick<RoleState, "permissionIds">, permissions: readonly Pick<PermissionState, "permissionId">[]): boolean {
    const privileged = new Set(permissions.filter(isPrivilegedPermission).map(permission => permission.permissionId));
    return role.permissionIds.some(permissionId => privileged.has(permissionId));
}
