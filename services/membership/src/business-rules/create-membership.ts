// services/membership/src/business-rules/create-membership.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • create a new Membership aggregate
//   • establish the initial Membership lifecycle
//   • initialize Membership-owned timestamps
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    MembershipState,
    MembershipType,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateMembershipInput {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly membershipType: MembershipType;

    /**
     * Whether the Membership should become immediately active.
     *
     * Invitation-created memberships normally begin as Pending until
     * Identity emits UserActivated.
     */
    readonly active?: boolean;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP
// -----------------------------------------------------------------------------

export function createMembership(
    input: CreateMembershipInput,
): MembershipState {
    const status = input.active
        ? "active"
        : "pending";

    return {
        membershipId: input.membershipId,

        identityId: input.identityId,

        tenantId: input.tenantId,

        membershipType: input.membershipType,

        status,

        activatedAt: input.active
            ? input.now
            : undefined,

        createdAt: input.now,

        updatedAt: input.now,
    };
}