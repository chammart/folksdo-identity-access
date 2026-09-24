// services/access/src/api/dto/permission-dto.ts
// -----------------------------------------------------------------------------
// PERMISSION DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of an Access Operations™ permission.
//
// Boundary:
//   • contains transport-safe primitive values only
//   • serializes dates as ISO 8601 strings
//   • does not expose persistence or Folksdo Engine metadata
//   • does not expose internal provider synchronization details
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PERMISSION CLASSIFICATION
// -----------------------------------------------------------------------------

export type PermissionScope =
    | "platform"
    | "tenant";

export type PermissionStatus =
    | "active"
    | "archived";

// -----------------------------------------------------------------------------
// PERMISSION DTO
// -----------------------------------------------------------------------------

export interface PermissionDto {
    /**
     * Stable Access-owned permission identifier.
     */
    readonly permissionId: string;

    /**
     * Canonical permission key used during authorization evaluation.
     *
     * Example:
     *   membership.read
     *   tenant.manage
     */
    readonly key: string;

    readonly name: string;

    readonly description?: string;

    /**
     * Defines whether the permission applies to the platform boundary or within
     * a Tenant authorization boundary.
     */
    readonly scope: PermissionScope;

    readonly status: PermissionStatus;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly archivedAt?: string;
}