// services/membership/src/usecases/redeem-invitation-usecase.ts
// -----------------------------------------------------------------------------
// REDEEM INVITATION USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Redeem Invitation™.
//
// Purpose:
//   • resolve an existing Membership invitation
//   • verify that the redeeming identity owns the invited email
//   • apply the explicit invitation-redemption business rule
//   • reuse an eligible Membership when one already exists
//   • create a pending Membership when one does not exist
//   • commit invitation and Membership state atomically
//   • emit the replayable invitation-redeemed event
//   • emit the replayable Membership-created event when a Membership is created
//   • publish the corresponding outbox notifications
//
// Aggregate boundary:
//   • the invitation coordinates the redemption transaction
//   • invitation redemption belongs to the invitation aggregate
//   • Membership creation belongs to the Membership aggregate
//   • both state transitions and replayable events are committed atomically
//   • downstream notifications are published through the transactional outbox
// -----------------------------------------------------------------------------

import type {
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    RedeemInvitationRequest,
} from "../api";

import {
    createMembership,
    normalizeInvitationEmail,
    redeemInvitation,
} from "../business-rules";

import {
    InvitationEmailMismatchError,
    InvitationNotFoundError,
    MembershipNotEligibleError,
} from "../errors";

import {
    createMembershipEvent,
    createMembershipOutboxMessage,
} from "../events";

import type {
    InvitationState,
    MembershipState,
} from "../state";

import {
    commitMembership,
} from "./membership-commit";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface RedeemInvitationResult {
    readonly invitation: InvitationState;
    readonly membership: MembershipState;
}

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface RedeemInvitationUseCase {
    execute(
        input: RedeemInvitationRequest,
        context: RuntimeContext,
    ): Promise<RedeemInvitationResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createRedeemInvitationUseCase(
    dependencies: MembershipMutationDependencies,
    expireInvitationUseCase?: import("./expire-invitation-usecase").ExpireInvitationUseCase,
): RedeemInvitationUseCase {
    return {
        async execute(
            input: RedeemInvitationRequest,
            context: RuntimeContext,
        ): Promise<RedeemInvitationResult> {
            // -----------------------------------------------------------------
            // RESOLVE INVITATION
            // -----------------------------------------------------------------
            // Invitation redemption must be based on canonical
            // Membership-owned invitation state.
            // -----------------------------------------------------------------

            const currentInvitation =
                await dependencies.readStore.findInvitationById(
                    input.invitationId,
                );

            if (!currentInvitation) {
                throw new InvitationNotFoundError(
                    input.invitationId,
                );
            }

            const now = dependencies.clock.nowTimestamp();

            // Lazy expiration is a committed lifecycle transition, not merely
            // a validation error. Scheduled and lazy paths share one use case.
            if (currentInvitation.status === "pending"
                && Date.parse(currentInvitation.expiresAt) <= Date.parse(now)
                && expireInvitationUseCase) {
                await expireInvitationUseCase.execute(currentInvitation.invitationId, context);
                throw new (await import("../errors")).InvitationExpiredError(
                    currentInvitation.invitationId, currentInvitation.expiresAt,
                );
            }

            // -----------------------------------------------------------------
            // VERIFY INVITED IDENTITY
            // -----------------------------------------------------------------
            // The authenticated identity must prove ownership of the email
            // address targeted by the invitation.
            //
            // Both values are compared in normalized form to prevent casing
            // and whitespace differences from affecting the business result.
            // -----------------------------------------------------------------

            const normalizedIdentityEmail =
                normalizeInvitationEmail(
                    input.identityEmail,
                );

            if (
                currentInvitation.invitedEmail
                !== normalizedIdentityEmail
            ) {
                throw new InvitationEmailMismatchError();
            }

            // -----------------------------------------------------------------
            // RESOLVE EXISTING MEMBERSHIP
            // -----------------------------------------------------------------
            // Invitation redemption must not create duplicate Memberships for
            // the same Identity and tenant.
            //
            // The read store may represent an absent Membership as either null
            // or undefined. Both values therefore mean that a new Membership
            // must be created.
            // -----------------------------------------------------------------

            const existingMembership =
                await dependencies.readStore.findMembership(
                    input.identityId,
                    currentInvitation.targetTenantId,
                );

            if (
                existingMembership
                && existingMembership.status !== "pending"
                && existingMembership.status !== "active"
            ) {
                throw new MembershipNotEligibleError(
                    existingMembership.membershipId,
                    existingMembership.status,
                );
            }

            const membershipCreated =
                existingMembership == null;

            // -----------------------------------------------------------------
            // CREATE OR REUSE MEMBERSHIP
            // -----------------------------------------------------------------
            // A newly redeemed invitation creates a pending Membership.
            //
            // Activation remains a separate lifecycle transition so Membership
            // participation is explicit, replayable, and independently
            // enforceable.
            // -----------------------------------------------------------------

            const membership =
                existingMembership
                ?? createMembership({
                    membershipId:
                        dependencies.ids.createMembershipId(),

                    identityId:
                        input.identityId,

                    tenantId:
                        currentInvitation.targetTenantId,

                    membershipType:
                        currentInvitation.membershipType,

                    now,

                    active:
                        false,
                });

            // -----------------------------------------------------------------
            // APPLY INVITATION BUSINESS RULE
            // -----------------------------------------------------------------
            // The pure domain rule validates the invitation lifecycle and
            // returns the redeemed Invitation state.
            // -----------------------------------------------------------------

            const invitation =
                redeemInvitation({
                    invitation:
                        currentInvitation,

                    identityId:
                        input.identityId,

                    now,
                });

            // -----------------------------------------------------------------
            // PREPARE STATE CHANGES
            // -----------------------------------------------------------------
            // When a Membership does not already exist, insert its complete
            // canonical state.
            //
            // The Invitation update is always committed as part of the same
            // atomic transaction.
            // -----------------------------------------------------------------

            const stateChanges: StateChange[] = [];

            if (membershipCreated) {
                stateChanges.push({
                    operation:
                        "insert",

                    collection:
                        dependencies.collections.memberships,

                    document: {
                        membershipId:
                            membership.membershipId,

                        identityId:
                            membership.identityId,

                        tenantId:
                            membership.tenantId,

                        membershipType:
                            membership.membershipType,

                        status:
                            membership.status,

                        activatedAt:
                            membership.activatedAt,

                        suspendedAt:
                            membership.suspendedAt,

                        suspensionReason:
                            membership.suspensionReason,

                        archivedAt:
                            membership.archivedAt,

                        createdAt:
                            membership.createdAt,

                        updatedAt:
                            membership.updatedAt,
                    },
                });
            }

            stateChanges.push({
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

                    redeemedAt:
                        invitation.redeemedAt,

                    redeemedByIdentityId:
                        invitation.redeemedByIdentityId,

                    updatedAt:
                        invitation.updatedAt,
                },
            });

            // -----------------------------------------------------------------
            // PREPARE INVITATION-REDEEMED PAYLOAD
            // -----------------------------------------------------------------
            // The redemption payload captures the complete business outcome,
            // including whether a new Membership was created or an eligible
            // existing Membership was reused.
            // -----------------------------------------------------------------

            const redemptionPayload = {
                invitationId:
                    invitation.invitationId,

                targetTenantId:
                    invitation.targetTenantId,

                invitedEmail:
                    invitation.invitedEmail,

                redeemedByIdentityId:
                    invitation.redeemedByIdentityId,

                redeemedAt:
                    invitation.redeemedAt,

                membershipCreated,

                membership: {
                    membershipId:
                        membership.membershipId,

                    identityId:
                        membership.identityId,

                    tenantId:
                        membership.tenantId,

                    membershipType:
                        membership.membershipType,

                    status:
                        membership.status,

                    activatedAt:
                        membership.activatedAt,

                    suspendedAt:
                        membership.suspendedAt,

                    suspensionReason:
                        membership.suspensionReason,

                    archivedAt:
                        membership.archivedAt,

                    createdAt:
                        membership.createdAt,

                    updatedAt:
                        membership.updatedAt,
                },

                occurredAt:
                    now,
            };

            // -----------------------------------------------------------------
            // PREPARE MEMBERSHIP-CREATED PAYLOAD
            // -----------------------------------------------------------------
            // Membership creation is a distinct replayable business fact.
            //
            // This payload is prepared only when redemption creates a new
            // Membership. Reusing an existing Membership must not emit a
            // duplicate creation event or notification.
            // -----------------------------------------------------------------

            const membershipCreatedPayload = {
                membershipId:
                    membership.membershipId,

                identityId:
                    membership.identityId,

                tenantId:
                    membership.tenantId,

                membershipType:
                    membership.membershipType,

                status:
                    membership.status,

                source:
                    "invitation" as const,

                invitationId:
                    invitation.invitationId,

                createdAt:
                    membership.createdAt,

                occurredAt:
                    now,
            };

            // -----------------------------------------------------------------
            // PREPARE REPLAYABLE EVENTS
            // -----------------------------------------------------------------
            // Event order is intentional:
            //
            //   1. the Invitation is redeemed
            //   2. the Membership is created, when applicable
            //
            // This preserves the causal flow of the redemption transaction.
            // -----------------------------------------------------------------

            const events: ReplayableEvent[] = [
                createMembershipEvent({
                    ids:
                        dependencies.ids,

                    context,

                    aggregateType:
                        "membership.invitation",

                    aggregateId:
                        invitation.invitationId,

                    eventType:
                        "membership.invitation.redeemed",

                    occurredAt:
                        now,

                    payload:
                        redemptionPayload,
                }),
            ];

            if (membershipCreated) {
                events.push(
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.membership",

                        aggregateId:
                            membership.membershipId,

                        eventType:
                            "membership.membership.created",

                        occurredAt:
                            now,

                        payload:
                            membershipCreatedPayload,
                    }),
                );
            }

            // -----------------------------------------------------------------
            // PREPARE OUTBOX MESSAGES
            // -----------------------------------------------------------------
            // The invitation-redeemed notification is always published.
            //
            // The Membership-created notification is published only when this
            // transaction created a new Membership.
            // -----------------------------------------------------------------

            const outbox: OutboxMessage[] = [
                createMembershipOutboxMessage({
                    ids:
                        dependencies.ids,

                    context,

                    subject:
                        dependencies
                            .outboxSubjects
                            .invitationRedeemed,

                    occurredAt:
                        now,

                    payload:
                        redemptionPayload,
                }),
            ];

            if (membershipCreated) {
                outbox.push(
                    createMembershipOutboxMessage({
                        ids:
                            dependencies.ids,

                        context,

                        subject:
                            dependencies
                                .outboxSubjects
                                .membershipCreated,

                        occurredAt:
                            now,

                        payload:
                            membershipCreatedPayload,
                    }),
                );
            }

            // -----------------------------------------------------------------
            // COMMIT
            // -----------------------------------------------------------------
            // Folksdo Engine™ atomically persists:
            //
            //   • the optional Membership insertion
            //   • the Invitation redemption state transition
            //   • the invitation-redeemed replayable event
            //   • the optional Membership-created replayable event
            //   • the corresponding transactional outbox messages
            //
            // The Invitation remains the coordinating aggregate for the
            // redemption transaction while each replayable event retains its
            // correct business aggregate identity.
            // -----------------------------------------------------------------

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.invitation",

                aggregateId:
                    invitation.invitationId,

                stateChanges,

                events,

                outbox,
            });

            return {
                invitation,
                membership,
            };
        },
    };
}