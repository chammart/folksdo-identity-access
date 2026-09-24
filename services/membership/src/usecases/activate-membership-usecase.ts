// services/membership/src/usecases/activate-membership-usecase.ts
// -----------------------------------------------------------------------------
// ACTIVATE MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Activate Membership™.
//
// Purpose:
//   • load the Membership aggregate
//   • apply the explicit Membership activation business rule
//   • prepare the replayable activation event
//   • prepare the matching outbox message
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
    activateMembership,
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

export interface ActivateMembershipUseCase {
    execute(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createActivateMembershipUseCase(
    dependencies: MembershipMutationDependencies,
): ActivateMembershipUseCase {
    return {
        async execute(
            membershipId: string,
            context: RuntimeContext,
        ): Promise<MembershipResult> {
            const currentMembership =
                await dependencies.readStore.findMembershipById(
                    membershipId,
                );

            if (!currentMembership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            const now = dependencies.clock.nowTimestamp();

            const membership = activateMembership({
                membership: currentMembership,
                now,
            });

            const payload = {
                membershipId: membership.membershipId,
                identityId: membership.identityId,
                tenantId: membership.tenantId,
                membershipType: membership.membershipType,
                status: membership.status,
                activatedAt: membership.activatedAt,
                occurredAt: now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation: "update",

                    collection:
                        dependencies.collections.memberships,

                    key: {
                        membershipId:
                            membership.membershipId,
                    },

                    patch: {
                        status: membership.status,

                        activatedAt: membership.activatedAt,

                        updatedAt: membership.updatedAt,
                    },
                },
            ];

            await commitMembership({
                dependencies,
                context,
                aggregateType: "membership.membership",
                aggregateId: membership.membershipId,
                stateChanges,
                events: [
                    createMembershipEvent({
                        ids: dependencies.ids,
                        context,
                        aggregateType:
                            "membership.membership",
                        aggregateId:
                            membership.membershipId,
                        eventType:
                            "membership.membership.activated",
                        occurredAt: now,
                        payload,
                    }),
                ],
                outbox: [
                    createMembershipOutboxMessage({
                        ids: dependencies.ids,
                        context,
                        subject:
                            dependencies
                                .outboxSubjects
                                .membershipActivated,
                        occurredAt: now,
                        payload,
                    }),
                ],
            });

            return membership;
        },
    };
}