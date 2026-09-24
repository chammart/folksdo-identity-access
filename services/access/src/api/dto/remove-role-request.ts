// services/access/src/api/dto/remove-role-request.ts
// -----------------------------------------------------------------------------
// REMOVE ROLE REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for removing a role assignment.
//
// This request removes an assignment. It does not archive the role definition.
// -----------------------------------------------------------------------------

export interface ApiRemoveRoleRequest {
    readonly assignmentId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}