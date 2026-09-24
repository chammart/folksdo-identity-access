// services/access/src/business-rules/create-role.ts
// -----------------------------------------------------------------------------
// CREATE ROLE
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • create canonical Access-owned Role state
//   • enforce Platform, System, and Tenant Role ownership boundaries
//   • initialize Role lifecycle and audit timestamps
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not construct replayable events or outbox messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import {
    AuthorizationContextInvalidError,
} from "../errors";

import type {
    RoleState,
    RoleType,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateRoleInput {
    /**
     * Stable Access-owned Role identifier.
     */
    readonly roleId: string;

    /**
     * Stable business key used to reference the Role.
     */
    readonly key: string;

    /**
     * Ownership family of the Role.
     */
    readonly roleType: RoleType;

    /**
     * Tenant owner for Tenant Roles.
     *
     * Platform and System Roles must not carry a Tenant identifier.
     */
    readonly tenantId?: string;

    /**
     * Canonical Role name.
     */
    readonly name: string;

    /**
     * Human-readable Role description.
     */
    readonly description: string;

    /**
     * Canonical Permission composition owned by the Role.
     */
    readonly permissionIds: readonly string[];

    /**
     * Actor responsible for creating the Role.
     */
    readonly createdBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// CREATE ROLE
// -----------------------------------------------------------------------------

export function createRole(
    input: CreateRoleInput,
): RoleState {
    if (
        input.roleType === "tenant"
        && !input.tenantId
    ) {
        throw new AuthorizationContextInvalidError(
            "Tenant Roles require a tenant identifier.",
        );
    }

    if (
        input.roleType !== "tenant"
        && input.tenantId
    ) {
        throw new AuthorizationContextInvalidError(
            "Platform and System Roles may not be tenant-owned.",
        );
    }

    return {
        roleId: input.roleId,

        key: input.key,

        roleType: input.roleType,

        tenantId: input.tenantId,

        name: input.name,

        description: input.description,

        permissionIds: [
            ...new Set(
                input.permissionIds,
            ),
        ],

        lifecycleStatus: "active",

        createdBy: input.createdBy,

        createdAt: input.now,

        updatedAt: input.now,
    };
}