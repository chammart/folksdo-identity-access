// services/access/src/business-rules/grant-permission.ts
// -----------------------------------------------------------------------------
// GRANT PERMISSION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • create a direct Permission grant or denial
//   • assign authorization through Membership
//   • preserve Tenant and resource scope
//   • support pending authorization before Membership activation
//   • initialize assignment activation state deterministically
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not construct replayable events or outbox messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import type {
    PermissionAssignmentScope,
    PermissionAssignmentState,
    PermissionAssignmentType,
    PermissionState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface GrantPermissionInput {
    /**
     * Stable Access-owned Permission Assignment identifier.
     */
    readonly assignmentId: string;

    /**
     * Membership receiving the direct Permission assignment.
     */
    readonly membershipId: string;

    /**
     * Tenant authorization boundary.
     */
    readonly tenantId: string;

    /**
     * Immutable Permission Catalog entry being assigned.
     */
    readonly permission: PermissionState;

    /**
     * Whether the direct assignment grants or denies the Permission.
     */
    readonly assignmentType: PermissionAssignmentType;

    /**
     * Resource scope to which the assignment applies.
     */
    readonly scope: PermissionAssignmentScope;

    /**
     * Whether the Membership is currently active.
     *
     * Inactive Memberships receive Pending assignments that may be activated
     * when Membership activation is observed.
     */
    readonly membershipIsActive: boolean;

    /**
     * Actor responsible for creating the assignment.
     */
    readonly assignedBy: string;

    /**
     * Timestamp from which the assignment becomes effective.
     */
    readonly effectiveFrom: string;

    /**
     * Optional assignment expiration timestamp.
     */
    readonly expiresAt?: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// GRANT PERMISSION
// -----------------------------------------------------------------------------

export function grantPermission(
    input: GrantPermissionInput,
): PermissionAssignmentState {
    const status =
        input.membershipIsActive
            ? "active"
            : "pending";

    return {
        assignmentId: input.assignmentId,

        membershipId: input.membershipId,

        tenantId: input.tenantId,

        permissionId: input.permission.permissionId,

        assignmentType: input.assignmentType,

        scope: input.scope,

        status,

        assignedBy: input.assignedBy,

        effectiveFrom: input.effectiveFrom,

        expiresAt: input.expiresAt,

        suspensionSources: [],

        activatedAt:
            status === "active"
                ? input.now
                : undefined,

        createdAt: input.now,

        updatedAt: input.now,
    };
}