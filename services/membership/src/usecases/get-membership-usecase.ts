// services/membership/src/usecases/get-membership-usecase.ts
// -----------------------------------------------------------------------------
// GET MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Get Membership™.
//
// Purpose:
//   • resolve a Membership by its stable identifier
//   • return canonical Membership-owned state
//   • fail deterministically when the Membership does not exist
//   • keep persistence details outside the use-case boundary
//
// Boundary:
//   • this is a read-only use case
//   • RuntimeContext is accepted for API consistency and observability
//   • no state mutation or Folksdo Engine™ commit is performed
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipResult,
} from "../api";

import {
    MembershipNotFoundError,
} from "../errors";

import type {
    MembershipReadStore,
} from "../read-store";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface GetMembershipUseCase {
    execute(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createGetMembershipUseCase(
    readStore: MembershipReadStore,
): GetMembershipUseCase {
    return {
        async execute(
            membershipId: string,
            _context: RuntimeContext,
        ): Promise<MembershipResult> {
            const membership =
                await readStore.findMembershipById(
                    membershipId,
                );

            if (!membership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            return membership;
        },
    };
}