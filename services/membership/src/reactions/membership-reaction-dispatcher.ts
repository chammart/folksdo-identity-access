// services/membership/src/reactions/membership-reaction-dispatcher.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP REACTION DISPATCHER
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { ActivatePendingMembershipsReaction } from "./activate-pending-memberships-reaction";
import type { IdentityMembershipEvent } from "./identity-membership-events";
import type { MembershipLifecycleEvent } from "./membership-lifecycle-events";
import type { MembershipLifecycleReaction } from "./membership-lifecycle-reaction";
import type { RedeemInvitationReaction } from "./redeem-invitation-reaction";

export type MembershipInboundEvent = IdentityMembershipEvent | MembershipLifecycleEvent;

export interface MembershipReactionDispatcher {
    handle(event: MembershipInboundEvent, context: RuntimeContext): Promise<void>;
    handleIdentityEvent(event: IdentityMembershipEvent, context: RuntimeContext): Promise<void>;
}

export interface MembershipReactionDispatcherDependencies {
    readonly redeemInvitationReaction: RedeemInvitationReaction;
    readonly activatePendingMembershipsReaction: ActivatePendingMembershipsReaction;
    readonly membershipLifecycleReaction: MembershipLifecycleReaction;
}

export function createMembershipReactionDispatcher(
    dependencies: MembershipReactionDispatcherDependencies,
): MembershipReactionDispatcher {
    async function handle(event: MembershipInboundEvent, context: RuntimeContext): Promise<void> {
        switch (event.eventType) {
            case "identity.invitation_redemption.requested":
                await dependencies.redeemInvitationReaction.handle(event.payload, context);
                return;
            case "identity.user.activated":
                await dependencies.activatePendingMembershipsReaction.handle(event.payload, context);
                return;
            case "identity.identity.archived":
            case "tenant.suspended":
            case "tenant.archived":
            case "subscription.suspended":
            case "subscription.reactivated":
                await dependencies.membershipLifecycleReaction.handle(event, context);
                return;
        }
    }
    return {
        handle,
        async handleIdentityEvent(event, context): Promise<void> {
            await handle(event, context);
        },
    };
}
