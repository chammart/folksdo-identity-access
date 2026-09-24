// services/access/src/api/dto/role-dto.ts
// -----------------------------------------------------------------------------
// ROLE DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of an Access Operations™ role.
//
// Boundary:
//   • exposes the role definition, lifecycle and permission composition
//   • does not expose canonical state documents directly
//   • does not expose Engine versions, events or outbox metadata
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ROLE CLASSIFICATION
// -----------------------------------------------------------------------------

export type ApiRoleType =
    | "platform"
    | "system"
    | "tenant";

export type RoleStatus =
    | "active"
    | "archived";

// -----------------------------------------------------------------------------
// ROLE DTO
// -----------------------------------------------------------------------------

export interface RoleDto {
    /**
     * Stable Access-owned role identifier.
     */
    readonly roleId: string;

    /**
     * Stable business key used to reference the role.
     */
    readonly key: string;

    readonly name: string;

    readonly description?: string;

    readonly type: ApiRoleType;

    /**
     * Present only for Tenant-owned role definitions.
     */
    readonly tenantId?: string;

    /**
     * Permission identifiers currently composed by the role.
     */
    readonly permissionIds: readonly string[];

    readonly status: RoleStatus;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly archivedAt?: string;

    readonly restoredAt?: string;
}