// services/membership/src/reactions/redeem-invitation-reaction.ts
// -----------------------------------------------------------------------------
// REDEEM INVITATION REACTION
// -----------------------------------------------------------------------------
// Membership-owned reaction for identity.invitation_redemption.requested.
//
// Purpose:
//   • receive the Identity-owned invitation redemption request
//   • translate Identity event terminology into Membership terminology
//   • delegate redemption orchestration to the dedicated use case
//   • keep event transport concerns outside business orchestration
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import {
    MembershipError,
} from "../errors";

import type {
    RedeemInvitationUseCase,
} from "../usecases";

import type {
    IdentityInvitationRedemptionRequestedPayload,
} from "./identity-membership-events";

import {
    MembershipReactionPermanentBusinessError,
} from "./membership-reaction-errors";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface RedeemInvitationReaction {
    handle(
        payload: IdentityInvitationRedemptionRequestedPayload,
        context: RuntimeContext,
    ): Promise<void>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createRedeemInvitationReaction(
    useCase: RedeemInvitationUseCase,
): RedeemInvitationReaction {
    return {
        async handle(
            payload: IdentityInvitationRedemptionRequestedPayload,
            context: RuntimeContext,
        ): Promise<void> {
            const identityId =
                payload.userId;

            try {
                await useCase.execute(
                    {
                        invitationId:
                            payload.invitationId,

                        identityId,

                        identityEmail:
                            payload.email,
                    },
                    context,
                );
            } catch (error) {
                if (
                    error instanceof MembershipError
                    && isPermanentRedemptionFailure(
                        error,
                    )
                ) {
                    throw new MembershipReactionPermanentBusinessError(
                        `membership_reaction_${error.code}`,
                        error.message,
                        error,
                    );
                }

                throw error;
            }
        },
    };
}
// -----------------------------------------------------------------------------
// FAILURE CLASSIFICATION
// -----------------------------------------------------------------------------

function isPermanentRedemptionFailure(
    error: MembershipError,
): boolean {
    return error.code !== "membership_commit_failed"
        && error.code !== "membership_authorization_unavailable";
}
