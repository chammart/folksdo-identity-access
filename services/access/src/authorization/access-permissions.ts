// services/access/src/authorization/access-permissions.ts
// -----------------------------------------------------------------------------
// ACCESS PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access Permission contracts and matching helpers.
//
// Purpose:
//   • identify Permissions independently from storage representation
//   • provide deterministic Permission key generation
//   • provide Permission request matching
//   • preserve immutable Permission Catalog semantics
//   • prevent service-specific Permission formatting from leaking
//   • avoid infrastructure dependencies
//
// Boundary:
//   • operates only on canonical Permission identifiers
//   • performs no persistence or external queries
//   • does not evaluate assignments, policies, or restrictions
//   • Permission Catalog entries do not have a lifecycle
// -----------------------------------------------------------------------------

import type {
    PermissionState,
} from "../state";

// -----------------------------------------------------------------------------
// PERMISSION KEY
// -----------------------------------------------------------------------------

export type AccessPermissionKey =
    `${string}.${string}.${string}`;

// -----------------------------------------------------------------------------
// PERMISSION REQUEST
// -----------------------------------------------------------------------------

export interface AccessPermissionRequest {
    /**
     * Business service that owns the protected capability.
     */
    readonly service: string;

    /**
     * Protected business resource.
     */
    readonly resource: string;

    /**
     * Requested business action.
     */
    readonly action: string;
}

// -----------------------------------------------------------------------------
// CREATE PERMISSION KEY
// -----------------------------------------------------------------------------

export function createAccessPermissionKey(
    permission: AccessPermissionRequest,
): AccessPermissionKey {
    const service =
        normalizePermissionSegment(
            permission.service,
        );

    const resource =
        normalizePermissionSegment(
            permission.resource,
        );

    const action =
        normalizePermissionSegment(
            permission.action,
        );

    return `${service}.${resource}.${action}`;
}

// -----------------------------------------------------------------------------
// PERMISSION MATCHING
// -----------------------------------------------------------------------------

export function permissionMatchesRequest(
    permission: PermissionState,
    request: AccessPermissionRequest,
): boolean {
    return (
        createAccessPermissionKey(permission)
        === createAccessPermissionKey(request)
    );
}

// -----------------------------------------------------------------------------
// NORMALIZE PERMISSION SEGMENT
// -----------------------------------------------------------------------------

function normalizePermissionSegment(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase();
}