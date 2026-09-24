// services/access/src/usecases/queries/list-permission-assignments-usecase.ts
// -----------------------------------------------------------------------------
// LIST PERMISSION ASSIGNMENTS USE CASE
// -----------------------------------------------------------------------------
import { toPermissionAssignmentResult } from "../shared";
import type { AccessUseCaseDependencies, PermissionAssignmentResult } from "../shared";
import type { PermissionAssignmentStatus, PermissionAssignmentType } from "../../state";
export interface ListPermissionAssignmentsRequest { readonly membershipId?: string; readonly identityId?: string; readonly status?: PermissionAssignmentStatus; readonly assignmentType?: PermissionAssignmentType; readonly tenantId?: string; }
export class ListPermissionAssignmentsUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) {}
    public async execute(request: ListPermissionAssignmentsRequest = {}): Promise<readonly PermissionAssignmentResult[]> {
        const assignments = await this.dependencies.readStore.listPermissionAssignments(request.membershipId, request.identityId);
        return assignments.filter((value) => request.status === undefined || value.status === request.status).filter((value) => request.assignmentType === undefined || value.assignmentType === request.assignmentType).filter((value) => request.tenantId === undefined || value.tenantId === request.tenantId).map(toPermissionAssignmentResult);
    }
}
