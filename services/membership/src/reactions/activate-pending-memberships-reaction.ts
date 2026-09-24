// services/membership/src/reactions/activate-pending-memberships-reaction.ts
// -----------------------------------------------------------------------------
// ACTIVATE PENDING MEMBERSHIPS REACTION
// -----------------------------------------------------------------------------
// Membership-owned reaction for identity.user.activated.
//
// Purpose:
//   • receive the activated Identity identifier
//   • translate the external Identity event contract
//   • delegate Membership activation to the dedicated use case
//   • keep event transport concerns outside business orchestration
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    ActivatePendingMembershipsUseCase,
} from "../usecases";

import type {
    IdentityUserActivatedPayload,
} from "./identity-membership-events";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface ActivatePendingMembershipsReaction {
    handle(
        payload: IdentityUserActivatedPayload,
        context: RuntimeContext,
    ): Promise<void>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createActivatePendingMembershipsReaction(
    useCase: ActivatePendingMembershipsUseCase,
): ActivatePendingMembershipsReaction {
    return {
        async handle(
            payload: IdentityUserActivatedPayload,
            context: RuntimeContext,
        ): Promise<void> {
            const identityId =
                payload.userId;

            await useCase.execute(
                identityId,
                context,
            );
        },
    };
}