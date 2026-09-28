// services/access/src/api/dto/access-impact-dto.ts
export interface AccessImpactDto {
    readonly tenantId: string;
    readonly roleId: string;
    readonly privilegedRole: boolean;
    readonly affectedMembershipIds: readonly string[];
    readonly affectedAssignmentIds: readonly string[];
    readonly affectedPermissionIds: readonly string[];
    readonly privilegedPermissionIds: readonly string[];
    readonly affectedMemberCount: number;
    readonly affectedAssignmentCount: number;
    readonly affectedPermissionCount: number;
    readonly evaluatedAt: string;
}
