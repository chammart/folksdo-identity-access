// services/access/src/business-rules/archive-role.ts
// -----------------------------------------------------------------------------
// ARCHIVE ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • archive an active Role
//   • enforce the valid Active → Archived lifecycle transition
//   • prevent future Role assignments
//   • preserve Role history
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidRoleTransitionError } from "../errors";

import type {
    RoleState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ArchiveRoleInput {
    readonly role: RoleState;

    readonly archivedBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ARCHIVE ROLE
// -----------------------------------------------------------------------------

export function archiveRole(
    input: ArchiveRoleInput,
): RoleState {
    if (input.role.lifecycleStatus !== "active") {
        throw new InvalidRoleTransitionError(
            input.role.lifecycleStatus,
            "archived",
            input.role.roleId,
        );
    }

    return {
        ...input.role,

        lifecycleStatus: "archived",

        archivedAt: input.now,

        archivedBy: input.archivedBy,

        updatedAt: input.now,
    };
}