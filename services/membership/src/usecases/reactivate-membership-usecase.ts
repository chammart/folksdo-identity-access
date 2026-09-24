// services/membership/src/usecases/reactivate-membership-usecase.ts
// -----------------------------------------------------------------------------
// REACTIVATE MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Reactivate Membership™.
//
// Purpose:
//   • resolve an existing suspended Membership
//   • apply the explicit Membership reactivation business rule
//   • persist only the changed Membership fields
//   • emit the replayable Membership-reactivated event
//   • publish the matching outbox message
//   • commit state, event, and outbox atomically through Folksdo Engine™
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    MembershipResult,
} from "../api";

import {
    reactivateMembership,
} from "../business-rules";

import {
    MembershipNotFoundError,
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

export interface ReactivateMembershipUseCase {
    execute(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createReactivateMembershipUseCase(
    dependencies: MembershipMutationDependencies,
): ReactivateMembershipUseCase {
    return {
        async execute(
            membershipId: string,
            context: RuntimeContext,
        ): Promise<MembershipResult> {
            const membership =
                await dependencies.readStore.findMembershipById(
                    membershipId,
                );

            if (!membership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            const reactivatedMembership =
                reactivateMembership({
                    membership,
                    now,
                });

            const payload = {
                membershipId:
                    reactivatedMembership.membershipId,

                tenantId:
                    reactivatedMembership.tenantId,

                identityId:
                    reactivatedMembership.identityId,

                membershipType:
                    reactivatedMembership.membershipType,

                status:
                    reactivatedMembership.status,

                occurredAt:
                    now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation:
                        "update",

                    collection:
                        dependencies.collections.memberships,

                    key: {
                        membershipId:
                            reactivatedMembership.membershipId,
                    },

                    patch: {
                        status:
                            reactivatedMembership.status,

                        suspendedAt:
                            reactivatedMembership.suspendedAt,

                        suspensionReason:
                            reactivatedMembership.suspensionReason,

                        suspensionSource:
                            reactivatedMembership.suspensionSource,

                        updatedAt:
                            reactivatedMembership.updatedAt,
                    },
                },
            ];

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.membership",

                aggregateId:
                    reactivatedMembership.membershipId,

                stateChanges,

                events: [
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.membership",

                        aggregateId:
                            reactivatedMembership.membershipId,

                        eventType:
                            "membership.membership.reactivated",

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
                                .membershipReactivated,

                        occurredAt:
                            now,

                        payload,
                    }),
                ],
            });

            return reactivatedMembership;
        },
    };
}