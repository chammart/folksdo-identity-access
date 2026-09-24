// services/access/src/business-rules/expire-assignment.ts
// -----------------------------------------------------------------------------
// EXPIRE ASSIGNMENT
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • expire time-bound Role and Permission Assignments
//   • preserve historical assignment state
//   • prevent expired assignments from participating in authorization
//   • enforce deterministic assignment expiration
//   • preserve assignment-specific semantic errors
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical assignment state
//   • performs no persistence or external queries
//   • does not emit events or publish messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    InvalidPermissionAssignmentTransitionError,
    InvalidRoleAssignmentTransitionError,
} from "../errors";

import type {
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../state";

// -----------------------------------------------------------------------------
// ASSIGNMENT
// -----------------------------------------------------------------------------

export type ExpirableAccessAssignment =
    | RoleAssignmentState
    | PermissionAssignmentState;

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ExpireAssignmentInput<
    TAssignment extends ExpirableAccessAssignment,
> {
    /**
     * Existing canonical assignment state.
     */
    readonly assignment: TAssignment;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// TYPE GUARD
// -----------------------------------------------------------------------------

function isRoleAssignment(
    assignment: ExpirableAccessAssignment,
): assignment is RoleAssignmentState {
    return "roleId" in assignment;
}

// -----------------------------------------------------------------------------
// INVALID TRANSITION ERROR
// -----------------------------------------------------------------------------

function throwInvalidAssignmentTransition(
    assignment: ExpirableAccessAssignment,
): never {
    if (isRoleAssignment(assignment)) {
        throw new InvalidRoleAssignmentTransitionError(
            assignment.status,
            "expired",
            assignment.assignmentId,
        );
    }

    throw new InvalidPermissionAssignmentTransitionError(
        assignment.status,
        "expired",
        assignment.assignmentId,
    );
}

// -----------------------------------------------------------------------------
// EXPIRATION ELIGIBILITY
// -----------------------------------------------------------------------------

function assertAssignmentCanExpire(
    assignment: ExpirableAccessAssignment,
    now: string,
): void {
    if (!assignment.expiresAt) {
        throwInvalidAssignmentTransition(
            assignment,
        );
    }

    if (assignment.expiresAt > now) {
        throwInvalidAssignmentTransition(
            assignment,
        );
    }

    if (
        assignment.status === "expired"
        || assignment.status === "archived"
        || assignment.status === "removed"
        || assignment.status === "revoked"
    ) {
        throwInvalidAssignmentTransition(
            assignment,
        );
    }
}

// -----------------------------------------------------------------------------
// EXPIRE ASSIGNMENT
// -----------------------------------------------------------------------------

export function expireAssignment(
    input: ExpireAssignmentInput<RoleAssignmentState>,
): RoleAssignmentState;

export function expireAssignment(
    input: ExpireAssignmentInput<PermissionAssignmentState>,
): PermissionAssignmentState;

export function expireAssignment(
    input: ExpireAssignmentInput<ExpirableAccessAssignment>,
): ExpirableAccessAssignment {
    assertAssignmentCanExpire(
        input.assignment,
        input.now,
    );

    if (isRoleAssignment(input.assignment)) {
        return {
            ...input.assignment,

            status: "expired",

            suspensionSources: [],

            expiredAt: input.now,

            updatedAt: input.now,
        };
    }

    return {
        ...input.assignment,

        status: "expired",

        suspensionSources: [],

        expiredAt: input.now,

        updatedAt: input.now,
    };
}