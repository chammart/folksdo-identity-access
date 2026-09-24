// services/access/src/business-rules/suspend-identity-access.ts
// -----------------------------------------------------------------------------
// SUSPEND IDENTITY ACCESS
// -----------------------------------------------------------------------------
// Pure Access domain rules for suspending Identity-scoped authorization.
//
// Purpose:
//   • record that a known Identity is disabled for authorization
//   • add the Identity suspension source to eligible Access assignments
//   • preserve overlapping suspension causes and historical assignment state
//   • remain deterministic and replay-safe
//   • avoid infrastructure dependencies
//
// Boundary:
//   • Identity Operations™ owns the canonical Identity lifecycle
//   • Access Operations™ owns authorization assignment lifecycle
//   • this module performs no persistence, queries, or event publication
// -----------------------------------------------------------------------------

import {
    InvalidIdentityAccessTransitionError,
} from "../errors";

import type {
    KnownIdentity,
} from "../known-facts";

import type {
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../state";

// -----------------------------------------------------------------------------
// KNOWN IDENTITY INPUT
// -----------------------------------------------------------------------------

export interface SuspendKnownIdentityAccessInput {
    readonly identity:
    KnownIdentity | null;

    readonly identityId: string;

    readonly now: string;
}

// -----------------------------------------------------------------------------
// ASSIGNMENT INPUT
// -----------------------------------------------------------------------------

export interface SuspendIdentityAssignmentInput<
    TAssignment extends
    RoleAssignmentState | PermissionAssignmentState,
> {
    readonly assignment: TAssignment;

    readonly now: string;
}

// -----------------------------------------------------------------------------
// KNOWN IDENTITY TRANSITION
// -----------------------------------------------------------------------------

export function suspendKnownIdentityAccess(
    input: SuspendKnownIdentityAccessInput,
): KnownIdentity {
    if (input.identity === null) {
        return {
            identityId:
                input.identityId,

            status:
                "disabled",

            disabledAt:
                input.now,

            updatedAt:
                input.now,
        };
    }

    if (input.identity.status === "archived") {
        throw new InvalidIdentityAccessTransitionError(
            "archived",
            "disabled",
            input.identity.identityId,
        );
    }

    if (input.identity.status === "disabled") {
        return input.identity;
    }

    return {
        ...input.identity,

        status:
            "disabled",

        disabledAt:
            input.now,

        updatedAt:
            input.now,
    };
}

// -----------------------------------------------------------------------------
// ASSIGNMENT TRANSITION
// -----------------------------------------------------------------------------

function suspendAssignment<
    TAssignment extends
    RoleAssignmentState | PermissionAssignmentState,
>(
    input: SuspendIdentityAssignmentInput<TAssignment>,
): TAssignment {
    const assignment =
        input.assignment;

    if (
        assignment.status === "expired"
        || assignment.status === "archived"
        || assignment.status === "removed"
        || assignment.status === "revoked"
    ) {
        return assignment;
    }

    if (
        assignment.suspensionSources.includes(
            "identity",
        )
    ) {
        return assignment;
    }

    const suspensionSources = [
        ...assignment.suspensionSources,
        "identity" as const,
    ];

    if (
        assignment.status === "active"
        || assignment.status === "suspended"
    ) {
        return {
            ...assignment,

            status:
                "suspended",

            suspensionSources,

            suspendedAt:
                input.now,

            updatedAt:
                input.now,
        };
    }

    return {
        ...assignment,

        suspensionSources,

        updatedAt:
            input.now,
    };
}

export function suspendRoleAssignmentForIdentity(
    input: SuspendIdentityAssignmentInput<RoleAssignmentState>,
): RoleAssignmentState {
    return suspendAssignment(
        input,
    );
}

export function suspendPermissionAssignmentForIdentity(
    input: SuspendIdentityAssignmentInput<PermissionAssignmentState>,
): PermissionAssignmentState {
    return suspendAssignment(
        input,
    );
}
