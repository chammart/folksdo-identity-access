// services/access/src/business-rules/update-role.ts
// -----------------------------------------------------------------------------
// UPDATE ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • update mutable Role metadata
//   • prevent inactive Roles from being modified
//   • preserve Role ownership and lifecycle state
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not alter Role ownership or lifecycle
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    RoleNotActiveError,
} from "../errors";

import type {
    RoleState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface UpdateRoleInput {
    /**
     * Existing canonical Role state.
     */
    readonly role: RoleState;

    /**
     * Updated canonical Role name.
     */
    readonly name: string;

    /**
     * Updated human-readable Role description.
     */
    readonly description: string;

    /**
     * Complete canonical Permission composition after the update.
     */
    readonly permissionIds: readonly string[];

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// UPDATE ROLE
// -----------------------------------------------------------------------------

export function updateRole(
    input: UpdateRoleInput,
): RoleState {
    if (input.role.lifecycleStatus !== "active") {
        throw new RoleNotActiveError(
            input.role.roleId,
        );
    }

    return {
        ...input.role,

        name: input.name,

        description: input.description,

        permissionIds: [
            ...new Set(
                input.permissionIds,
            ),
        ],

        updatedAt: input.now,
    };
}