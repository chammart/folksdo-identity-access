// services/membership/src/usecases/revoke-invitation-usecase.ts
// -----------------------------------------------------------------------------
// REVOKE INVITATION USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Revoke Invitation™.
//
// Purpose:
//   • resolve the Membership invitation
//   • apply the explicit invitation-revocation business rule
//   • prepare the replayable invitation-revoked event
//   • prepare the matching outbox notification
//   • commit state, event, and outbox atomically through Folksdo Engine™
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    InvitationResult,
} from "../api";

import {
    revokeInvitation,
} from "../business-rules";

import {
    InvitationNotFoundError,
} from "../errors";

import {
    createMembershipEvent,
    createMembershipOutboxMessage,
} from "../events";

import {
    commitMembership,
} from "./membership-commit";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface RevokeInvitationUseCase {
    execute(
        invitationId: string,
        context: RuntimeContext,
    ): Promise<InvitationResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createRevokeInvitationUseCase(
    dependencies: MembershipMutationDependencies,
): RevokeInvitationUseCase {
    return {
        async execute(
            invitationId: string,
            context: RuntimeContext,
        ): Promise<InvitationResult> {
            const currentInvitation =
                await dependencies.readStore.findInvitationById(
                    invitationId,
                );

            if (!currentInvitation) {
                throw new InvitationNotFoundError(
                    invitationId,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            const invitation =
                revokeInvitation({
                    invitation:
                        currentInvitation,

                    now,
                });

            const payload = {
                invitationId:
                    invitation.invitationId,

                targetTenantId:
                    invitation.targetTenantId,

                invitedEmail:
                    invitation.invitedEmail,

                membershipType:
                    invitation.membershipType,

                status:
                    invitation.status,

                revokedAt:
                    invitation.revokedAt,

                occurredAt:
                    now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation:
                        "update",

                    collection:
                        dependencies.collections.invitations,

                    key: {
                        invitationId:
                            invitation.invitationId,
                    },

                    patch: {
                        status:
                            invitation.status,

                        revokedAt:
                            invitation.revokedAt,

                        updatedAt:
                            invitation.updatedAt,
                    },
                },
            ];

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.invitation",

                aggregateId:
                    invitation.invitationId,

                stateChanges,

                events: [
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.invitation",

                        aggregateId:
                            invitation.invitationId,

                        eventType:
                            "membership.invitation.revoked",

                        occurredAt:
                            now,

                        payload,
                    }),
                ],

                outbox: [
                    createMembershipOutboxMessage({
                        ids:
                            dependencies.ids,

                        context,

                        subject:
                            dependencies
                                .outboxSubjects
                                .invitationRevoked,

                        occurredAt:
                            now,

                        payload,
                    }),
                ],
            });

            return invitation;
        },
    };
}
