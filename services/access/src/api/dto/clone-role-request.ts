// services/access/src/api/dto/clone-role-request.ts
// -----------------------------------------------------------------------------
// CLONE ROLE REQUEST
// -----------------------------------------------------------------------------

export interface ApiCloneRoleRequest {
    readonly key: string;
    readonly name: string;
    readonly description?: string;
}
