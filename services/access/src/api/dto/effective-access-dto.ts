// services/access/src/api/dto/effective-access-dto.ts
// -----------------------------------------------------------------------------
// EFFECTIVE ACCESS DTO
// -----------------------------------------------------------------------------

export interface EffectiveAccessPermissionDefinitionDto {
    readonly permissionId: string;
    readonly service: string;
    readonly resource: string;
    readonly action: string;
    readonly displayName: string;
    readonly description: string;
    readonly classification: string;
    readonly createdAt: string;
}
export interface EffectiveAccessRestrictionDto {
    readonly restrictionId: string;
    readonly tenantId?: string;
    readonly target: Readonly<Record<string, string>>;
    readonly restrictionReason: string;
    readonly status: "active" | "expired" | "removed";
    readonly effectiveFrom: string;
    readonly expiresAt?: string;
    readonly createdBy: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly expiredAt?: string;
    readonly removedAt?: string;
    readonly removedBy?: string;
}

export interface EffectiveAccessPermissionDto {
    readonly permission: EffectiveAccessPermissionDefinitionDto;
    readonly effect: "grant" | "deny";
    readonly source: "role_assignment" | "permission_assignment";
    readonly sourceId: string;
    readonly effectiveFrom: string;
    readonly expiresAt?: string;
}
export interface EffectiveAccessDto {
    readonly identityId: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly membershipIsValid: boolean;
    readonly effectivePermissions: readonly EffectiveAccessPermissionDto[];
    readonly restrictions: readonly EffectiveAccessRestrictionDto[];
    readonly evaluatedAt: string;
}
