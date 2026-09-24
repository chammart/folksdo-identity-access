// services/access/src/api/dto/archive-role-request.ts
// -----------------------------------------------------------------------------
// ARCHIVE ROLE REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for archiving an Access role.
//
// The actor performing the operation is derived from the authenticated
// execution context and must not be trusted from the request body.
// -----------------------------------------------------------------------------

export interface ApiArchiveRoleRequest {
    readonly roleId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}