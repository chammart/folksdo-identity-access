// services/access/src/business-rules/create-restriction.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS RESTRICTION
// -----------------------------------------------------------------------------
// Pure Access domain rule.
//
// Purpose:
//   • create an explicit authorization Restriction
//   • preserve deterministic Restriction applicability
//   • initialize Restriction lifecycle and timestamps
//   • ensure Restrictions only reduce authorization
//   • avoid infrastructure dependencies
//
// Boundary:
//   • accepts validated canonical input
//   • performs no persistence or external queries
//   • does not emit events or publish messages
//   • receives the current timestamp explicitly
// -----------------------------------------------------------------------------

import type {
    AccessRestrictionState,
    AccessRestrictionTarget,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateRestrictionInput {
    /**
     * Stable Access-owned Restriction identifier.
     */
    readonly restrictionId: string;

    /**
     * Authorization subject or resource affected by the Restriction.
     */
    readonly target: AccessRestrictionTarget;

    /**
     * Tenant authorization boundary.
     */
    readonly tenantId?: string;

    /**
     * Business reason explaining why the Restriction exists.
     */
    readonly restrictionReason: string;

    /**
     * Timestamp from which the Restriction becomes effective.
     */
    readonly effectiveFrom: string;

    /**
     * Optional expiration timestamp.
     */
    readonly expiresAt?: string;

    /**
     * Actor responsible for creating the Restriction.
     */
    readonly createdBy: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// CREATE ACCESS RESTRICTION
// -----------------------------------------------------------------------------

export function createRestriction(
    input: CreateRestrictionInput,
): AccessRestrictionState {
    return {
        restrictionId: input.restrictionId,

        tenantId: input.tenantId,

        target: input.target,

        restrictionReason: input.restrictionReason,

        status: "active",

        effectiveFrom: input.effectiveFrom,

        expiresAt: input.expiresAt,

        createdBy: input.createdBy,

        createdAt: input.now,

        updatedAt: input.now,
    };
}