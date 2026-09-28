// services/access/src/api/dto/access-summary-dto.ts
// Compact administration projection derived from canonical effective Access facts.

export interface AccessSummaryDto {
    readonly identityId: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly membershipIsValid: boolean;
    readonly effectivePermissionCount: number;
    readonly roleAssignmentCount: number;
    readonly directPermissionAssignmentCount: number;
    readonly restrictionCount: number;
    readonly expiringAccessCount: number;
    readonly privilegedPermissionCount: number;
    readonly hasPrivilegedAccess: boolean;
    readonly evaluatedAt: string;
}
