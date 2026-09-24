// services/access/src/business-rules/restore-role.ts
// -----------------------------------------------------------------------------
// RESTORE ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • restore an archived Role
//   • enforce the valid Archived → Active lifecycle transition
//   • preserve historical Role archival metadata
//   • record Role restoration audit metadata
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical Role state
//   • performs no persistence or external queries
//   • does not construct replayable events or outbox messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    InvalidRoleTransitionError,
} from "../errors";

import type {
    RoleState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RestoreRoleInput {
    /**
     * Existing canonical Role state.
     */
    readonly role: RoleState;

    /**
     * Actor responsible for restoring the Role.
     */
    readonly restoredBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// RESTORE ROLE
// -----------------------------------------------------------------------------

export function restoreRole(
    input: RestoreRoleInput,
): RoleState {
    if (input.role.lifecycleStatus !== "archived") {
        throw new InvalidRoleTransitionError(
            input.role.lifecycleStatus,
            "active",
            input.role.roleId,
        );
    }

    return {
        ...input.role,

        lifecycleStatus: "active",

        restoredAt: input.now,

        restoredBy: input.restoredBy,

        updatedAt: input.now,
    };
}