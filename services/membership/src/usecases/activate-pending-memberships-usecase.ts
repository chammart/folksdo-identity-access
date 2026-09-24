// services/membership/src/usecases/activate-pending-memberships-usecase.ts
// -----------------------------------------------------------------------------
// ACTIVATE PENDING MEMBERSHIPS USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Activate Pending Memberships™.
//
// Purpose:
//   • resolve all Memberships associated with an Identity
//   • select Memberships currently in Pending state
//   • activate each eligible Membership through the explicit activation use case
//   • preserve one atomic Engine commit per Membership aggregate
//   • return the Memberships activated by this execution
//
// Trigger:
//   • Identity Operations™ emits identity.user.activated
//
// Boundary:
//   • this use case coordinates multiple Membership aggregates
//   • each Membership activation remains independently committed
//   • no generic lifecycle transition helper is used
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipResult,
} from "../api";

import {
    createActivateMembershipUseCase,
} from "./activate-membership-usecase";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface ActivatePendingMembershipsUseCase {
    execute(
        identityId: string,
        context: RuntimeContext,
    ): Promise<readonly MembershipResult[]>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createActivatePendingMembershipsUseCase(
    dependencies: MembershipMutationDependencies,
): ActivatePendingMembershipsUseCase {
    const activateMembershipUseCase =
        createActivateMembershipUseCase(
            dependencies,
        );

    return {
        async execute(
            identityId: string,
            context: RuntimeContext,
        ): Promise<readonly MembershipResult[]> {
            const memberships =
                await dependencies
                    .readStore
                    .listMembershipsByIdentity(
                        identityId,
                    );

            const pendingMemberships =
                memberships.filter(
                    (membership) =>
                        membership.status === "pending",
                );

            const activatedMemberships:
                MembershipResult[] = [];

            for (const membership of pendingMemberships) {
                const activatedMembership =
                    await activateMembershipUseCase.execute(
                        membership.membershipId,
                        context,
                    );

                activatedMemberships.push(
                    activatedMembership,
                );
            }

            return activatedMemberships;
        },
    };
}