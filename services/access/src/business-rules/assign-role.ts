// services/access/src/business-rules/assign-role.ts
// -----------------------------------------------------------------------------
// ASSIGN ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • assign an eligible Role to a Membership
//   • enforce Role and Tenant authorization boundaries
//   • initialize Role Assignment lifecycle state
//   • support pending authorization before Membership activation
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
    RoleNotActiveError,
} from "../errors";

import type {
    RoleAssignmentState,
    RoleState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface AssignRoleInput {
    /**
     * Stable Access-owned Role Assignment identifier.
     */
    readonly assignmentId: string;

    /**
     * Membership receiving the Role.
     */
    readonly membershipId: string;

    /**
     * Tenant authorization scope.
     */
    readonly tenantId: string;

    /**
     * Canonical Role being assigned.
     */
    readonly role: RoleState;

    /**
     * Whether the Membership is currently active.
     */
    readonly membershipIsActive: boolean;

    /**
     * Actor performing the assignment.
     */
    readonly assignedBy: string;

    /**
     * Timestamp from which the assignment becomes effective.
     */
    readonly effectiveFrom: string;

    /**
     * Optional assignment expiration.
     */
    readonly expiresAt?: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ASSIGN ROLE
// -----------------------------------------------------------------------------

export function assignRole(
    input: AssignRoleInput,
): RoleAssignmentState {
    if (input.role.lifecycleStatus !== "active") {
        throw new RoleNotActiveError(
            input.role.roleId,
        );
    }

    if (input.role.roleType === "platform") {
        throw new AuthorizationContextInvalidError(
            "Platform Roles may not be assigned through Membership authorization.",
        );
    }

    if (
        input.role.roleType === "tenant"
        && input.role.tenantId !== input.tenantId
    ) {
        throw new AuthorizationContextInvalidError(
            "Tenant Role and Membership tenant scope must match.",
        );
    }

    const status = input.membershipIsActive
        ? "active"
        : "pending";

    return {
        assignmentId: input.assignmentId,

        membershipId: input.membershipId,

        roleId: input.role.roleId,

        tenantId: input.tenantId,

        status,

        activatedAt:
            status === "active"
                ? input.now
                : undefined,

        assignedBy: input.assignedBy,

        effectiveFrom: input.effectiveFrom,

        expiresAt: input.expiresAt,

        suspensionSources: [],

        createdAt: input.now,

        updatedAt: input.now,
    };
}