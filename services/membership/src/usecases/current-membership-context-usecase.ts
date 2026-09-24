// services/membership/src/usecases/current-membership-context-usecase.ts
// -----------------------------------------------------------------------------
// CURRENT MEMBERSHIP CONTEXT USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Current Membership Context™.
//
// Purpose:
//   • resolve the active Membership context for an Identity
//   • return the tenant execution context owned by Membership Operations™
//   • fail deterministically when no active context exists
//   • keep authorization concerns outside Membership Operations™
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
    MembershipContextResult,
} from "../api";

import {
    MembershipContextNotFoundError,
} from "../errors";

import type {
    MembershipReadStore,
} from "../read-store";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface CurrentMembershipContextUseCase {
    execute(
        identityId: string,
        context: RuntimeContext,
    ): Promise<MembershipContextResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createCurrentMembershipContextUseCase(
    readStore: MembershipReadStore,
): CurrentMembershipContextUseCase {
    return {
        async execute(
            identityId: string,
            _context: RuntimeContext,
        ): Promise<MembershipContextResult> {
            const membershipContext =
                await readStore.findCurrentContext(
                    identityId,
                );

            if (!membershipContext) {
                throw new MembershipContextNotFoundError(
                    identityId,
                );
            }

            return membershipContext;
        },
    };
}