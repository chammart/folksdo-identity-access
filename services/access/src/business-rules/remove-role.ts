// services/access/src/business-rules/remove-role.ts
// -----------------------------------------------------------------------------
// REMOVE ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • remove an existing Role Assignment
//   • preserve historical assignment state
//   • prevent removed assignments from participating in authorization
//   • enforce terminal assignment lifecycle behavior
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidRoleAssignmentTransitionError } from "../errors";

import type {
    RoleAssignmentState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RemoveRoleInput {
    readonly assignment: RoleAssignmentState;

    readonly removedBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REMOVE ROLE
// -----------------------------------------------------------------------------

export function removeRole(
    input: RemoveRoleInput,
): RoleAssignmentState {
    if (
        input.assignment.status === "removed"
        || input.assignment.status === "archived"
        || input.assignment.status === "expired"
    ) {
        throw new InvalidRoleAssignmentTransitionError(
            input.assignment.status,
            "removed",
            input.assignment.assignmentId,
        );
    }

    return {
        ...input.assignment,

        status: "removed",

        suspensionSources: [],

        removedAt: input.now,

        removedBy: input.removedBy,

        updatedAt: input.now,
    };
}