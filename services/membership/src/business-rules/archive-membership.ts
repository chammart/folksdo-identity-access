// services/membership/src/business-rules/archive-membership.ts
// -----------------------------------------------------------------------------
// ARCHIVE MEMBERSHIP
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • permanently end tenant participation
//   • allow Pending, Active, or Suspended Memberships to be archived
//   • prevent archived Memberships from transitioning again
//   • preserve the business reason for archival
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

import { InvalidMembershipTransitionError } from "../errors";

import type {
    MembershipState,
} from "../state";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ArchiveMembershipInput {
    readonly membership: MembershipState;

    /**
     * Business-safe reason for archiving participation.
     */
    readonly reason: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ARCHIVE MEMBERSHIP
// -----------------------------------------------------------------------------

export function archiveMembership(
    input: ArchiveMembershipInput,
): MembershipState {
    if (input.membership.status === "archived") {
        throw new InvalidMembershipTransitionError(
            input.membership.status,
            "archived",
            input.membership.membershipId,
        );
    }

    return {
        ...input.membership,

        status: "archived",

        archivedAt: input.now,

        archiveReason: input.reason,

        suspensionReason: undefined,

        suspensionSource: undefined,

        updatedAt: input.now,
    };
}