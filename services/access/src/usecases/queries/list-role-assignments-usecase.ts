// services/access/src/usecases/queries/list-role-assignments-usecase.ts
// -----------------------------------------------------------------------------
// LIST ROLE ASSIGNMENTS USE CASE
// -----------------------------------------------------------------------------
import { toRoleAssignmentResult } from "../shared";
import type { AccessUseCaseDependencies, RoleAssignmentResult } from "../shared";
import type { RoleAssignmentStatus } from "../../state";
export interface ListRoleAssignmentsRequest { readonly membershipId?: string; readonly identityId?: string; readonly status?: RoleAssignmentStatus; readonly tenantId?: string; }
export class ListRoleAssignmentsUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) {}
    public async execute(request: ListRoleAssignmentsRequest = {}): Promise<readonly RoleAssignmentResult[]> {
        const assignments = await this.dependencies.readStore.listRoleAssignments(request.membershipId, request.identityId);
        return assignments.filter((value) => request.status === undefined || value.status === request.status).filter((value) => request.tenantId === undefined || value.tenantId === request.tenantId).map(toRoleAssignmentResult);
    }
}
