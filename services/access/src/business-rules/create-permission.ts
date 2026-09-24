// services/access/src/business-rules/create-permission.ts
// -----------------------------------------------------------------------------
// CREATE PERMISSION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • register a protected business action
//   • create canonical immutable Permission Catalog state
//   • preserve stable Permission identifiers
//   • enforce deterministic Permission identifier construction
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not emit events or publish messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    AuthorizationContextInvalidError,
} from "../errors";

import type {
    PermissionClassification,
    PermissionState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreatePermissionInput {
    /**
     * Stable Permission Catalog identifier.
     *
     * Format:
     *
     * service.resource.action
     */
    readonly permissionId: string;

    /**
     * Business service owning the protected action.
     */
    readonly service: string;

    /**
     * Protected business resource.
     */
    readonly resource: string;

    /**
     * Protected business action.
     */
    readonly action: string;

    /**
     * Human-readable Permission name.
     */
    readonly displayName: string;

    /**
     * Human-readable Permission description.
     */
    readonly description: string;

    /**
     * Permission security classification.
     */
    readonly classification: PermissionClassification;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// CREATE PERMISSION
// -----------------------------------------------------------------------------

export function createPermission(
    input: CreatePermissionInput,
): PermissionState {
    const expectedPermissionId = [
        input.service,
        input.resource,
        input.action,
    ].join(".");

    if (input.permissionId !== expectedPermissionId) {
        throw new AuthorizationContextInvalidError(
            `Permission identifier must be ${expectedPermissionId}.`,
        );
    }

    return {
        permissionId: input.permissionId,

        service: input.service,

        resource: input.resource,

        action: input.action,

        displayName: input.displayName,

        description: input.description,

        classification: input.classification,

        createdAt: input.now,
    };
}