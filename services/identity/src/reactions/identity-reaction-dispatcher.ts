// services/identity/src/reactions/identity-reaction-dispatcher.ts
// -----------------------------------------------------------------------------
// IDENTITY REACTION DISPATCHER
// -----------------------------------------------------------------------------
// Runtime-facing dispatcher for Identity Service™ reactions.
//
// Purpose:
//   • expose one stable reaction boundary for external event delivery
//   • route Membership invitation lifecycle events to Identity reactions
//   • keep Identity decoupled from Membership runtime implementation
//   • keep event choreography inside the Identity service boundary
//
// Important:
//
// This dispatcher does not subscribe to a broker directly.
// It is the Identity-owned handler that Processing/Event Backbone can invoke
// when a Membership invitation event is delivered to Identity.
// -----------------------------------------------------------------------------

import type {
    ExpireKnownInvitationReaction,
} from "./expire-known-invitation-reaction";

import type {
    MarkKnownInvitationRedeemedReaction,
} from "./mark-known-invitation-redeemed-reaction";

import type {
    MembershipInvitationCreatedEvent,
    MembershipInvitationExpiredEvent,
    MembershipInvitationRedeemedEvent,
    MembershipInvitationRevokedEvent,
} from "./known-invitation-events";

import type {
    RecordKnownInvitationReaction,
} from "./record-known-invitation-reaction";

import type {
    RevokeKnownInvitationReaction,
} from "./revoke-known-invitation-reaction";

// -----------------------------------------------------------------------------
// EVENT CONTRACT
// -----------------------------------------------------------------------------

export type MembershipInvitationLifecycleEvent =
    | MembershipInvitationCreatedEvent
    | MembershipInvitationExpiredEvent
    | MembershipInvitationRevokedEvent
    | MembershipInvitationRedeemedEvent;

// -----------------------------------------------------------------------------
// DISPATCHER CONTRACT
// -----------------------------------------------------------------------------

export interface IdentityReactionDispatcher {
    handleMembershipInvitationEvent(
        event: MembershipInvitationLifecycleEvent,
    ): Promise<void>;
}

export interface CreateIdentityReactionDispatcherInput {
    readonly recordKnownInvitation: RecordKnownInvitationReaction;

    readonly expireKnownInvitation: ExpireKnownInvitationReaction;

    readonly revokeKnownInvitation: RevokeKnownInvitationReaction;

    readonly markKnownInvitationRedeemed: MarkKnownInvitationRedeemedReaction;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createIdentityReactionDispatcher(
    input: CreateIdentityReactionDispatcherInput,
): IdentityReactionDispatcher {
    return {
        async handleMembershipInvitationEvent(
            event: MembershipInvitationLifecycleEvent,
        ): Promise<void> {
            switch (event.eventType) {
                case "membership.invitation.created": {
                    await input.recordKnownInvitation.handle(event);
                    return;
                }

                case "membership.invitation.expired": {
                    await input.expireKnownInvitation.handle(event);
                    return;
                }

                case "membership.invitation.revoked": {
                    await input.revokeKnownInvitation.handle(event);
                    return;
                }

                case "membership.invitation.redeemed": {
                    await input.markKnownInvitationRedeemed.handle(event);
                    return;
                }
            }
        },
    };
}
