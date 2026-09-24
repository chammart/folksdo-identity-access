// services/access/src/api/dto/revoke-permission-request.ts
// -----------------------------------------------------------------------------
// REVOKE PERMISSION REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for revoking a direct permission assignment.
//
// This request does not archive or modify the permission catalog entry.
// -----------------------------------------------------------------------------

export interface ApiRevokePermissionRequest {
    readonly assignmentId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}