// services/access/src/api/dto/update-role-request.ts
// -----------------------------------------------------------------------------
// UPDATE ROLE REQUEST
// -----------------------------------------------------------------------------
// Transport-safe request accepted by the Update Role API operation.
//
// Boundary:
//   • roleId is normally supplied through the route path
//   • supports explicit replacement of mutable role definition fields
//   • does not permit direct lifecycle mutation
// -----------------------------------------------------------------------------

export interface ApiUpdateRoleRequest {
    readonly roleId: string;

    readonly name?: string;

    readonly description?: string;

    /**
     * Complete replacement permission composition when supplied.
     */
    readonly permissionIds?: readonly string[];
}