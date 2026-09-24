// services/access/src/api/dto/restore-role-request.ts
// -----------------------------------------------------------------------------
// RESTORE ROLE REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for restoring an archived Access role.
// -----------------------------------------------------------------------------

export interface ApiRestoreRoleRequest {
    readonly roleId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}