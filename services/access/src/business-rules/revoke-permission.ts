// services/access/src/business-rules/revoke-permission.ts
// -----------------------------------------------------------------------------
// REVOKE PERMISSION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • revoke a direct Permission Assignment
//   • preserve historical assignment state
//   • prevent revoked assignments from participating in authorization
//   • enforce terminal assignment lifecycle behavior
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidPermissionAssignmentTransitionError } from "../errors";

import type {
    PermissionAssignmentState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RevokePermissionInput {
    readonly assignment: PermissionAssignmentState;

    readonly revokedBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// REVOKE PERMISSION
// -----------------------------------------------------------------------------

export function revokePermission(
    input: RevokePermissionInput,
): PermissionAssignmentState {
    if (
        input.assignment.status === "revoked"
        || input.assignment.status === "archived"
        || input.assignment.status === "expired"
    ) {
        throw new InvalidPermissionAssignmentTransitionError(
            input.assignment.status,
            "revoked",
            input.assignment.assignmentId,
        );
    }

    return {
        ...input.assignment,

        status: "revoked",

        suspensionSources: [],

        revokedAt: input.now,

        revokedBy: input.revokedBy,

        updatedAt: input.now,
    };
}