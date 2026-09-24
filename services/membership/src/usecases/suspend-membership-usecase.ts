// services/membership/src/usecases/suspend-membership-usecase.ts
// -----------------------------------------------------------------------------
// SUSPEND MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Suspend Membership™.
//
// Purpose:
//   • resolve an existing active Membership
//   • apply the explicit Membership suspension business rule
//   • persist only the changed Membership fields
//   • emit the replayable Membership-suspended event
//   • emit the replayable Membership-context-cleared event
//   • publish the corresponding Membership-suspended outbox message
//   • commit state, events, and outbox atomically through Folksdo Engine™
//
// Context behavior:
//   • a suspended Membership is no longer eligible for tenant execution context
//   • any context selecting that Membership must therefore be considered cleared
//
// Boundary:
//   • Membership owns Membership lifecycle state
//   • Membership owns active tenant participation context
//   • Access Operations™ remains responsible for roles and permissions
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    MembershipResult,
    SuspendMembershipRequest,
} from "../api";

import {
    suspendMembership,
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

export interface SuspendMembershipUseCase {
    execute(
        membershipId: string,
        input: SuspendMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createSuspendMembershipUseCase(
    dependencies: MembershipMutationDependencies,
): SuspendMembershipUseCase {
    return {
        async execute(
            membershipId: string,
            input: SuspendMembershipRequest,
            context: RuntimeContext,
        ): Promise<MembershipResult> {
            // -----------------------------------------------------------------
            // RESOLVE MEMBERSHIP
            // -----------------------------------------------------------------
            // Membership lifecycle decisions must always be based on the
            // canonical Membership-owned state.
            // -----------------------------------------------------------------

            const currentMembership =
                await dependencies.readStore.findMembershipById(
                    membershipId,
                );

            if (!currentMembership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            // -----------------------------------------------------------------
            // APPLY BUSINESS RULE
            // -----------------------------------------------------------------
            // The pure domain rule enforces the valid Active → Suspended
            // transition and returns the complete next Membership state.
            // -----------------------------------------------------------------

            const membership =
                suspendMembership({
                    membership:
                        currentMembership,

                    reason:
                        input.reason,

                    source:
                        "manual",

                    now,
                });

            // -----------------------------------------------------------------
            // PREPARE STATE CHANGE
            // -----------------------------------------------------------------
            // Persist only fields changed by the suspension lifecycle
            // transition.
            //
            // Active Membership Context is projection-derived from replayable
            // Membership events. The context-cleared event below invalidates
            // any selected execution context backed by this Membership.
            // -----------------------------------------------------------------

            const stateChanges: StateChange[] = [
                {
                    operation:
                        "update",

                    collection:
                        dependencies.collections.memberships,

                    key: {
                        membershipId:
                            membership.membershipId,
                    },

                    patch: {
                        status:
                            membership.status,

                        suspendedAt:
                            membership.suspendedAt,

                        suspensionReason:
                            membership.suspensionReason,

                        suspensionSource:
                            membership.suspensionSource,

                        updatedAt:
                            membership.updatedAt,
                    },
                },
            ];

            // -----------------------------------------------------------------
            // PREPARE MEMBERSHIP-SUSPENDED PAYLOAD
            // -----------------------------------------------------------------

            const membershipSuspendedPayload = {
                membershipId:
                    membership.membershipId,

                tenantId:
                    membership.tenantId,

                identityId:
                    membership.identityId,

                membershipType:
                    membership.membershipType,

                status:
                    membership.status,

                suspensionReason:
                    membership.suspensionReason,

                suspendedAt:
                    membership.suspendedAt,

                suspensionSource:
                    "manual" as const,

                occurredAt:
                    now,
            };

            // -----------------------------------------------------------------
            // PREPARE CONTEXT-CLEARED PAYLOAD
            // -----------------------------------------------------------------
            // Suspending the Membership invalidates its eligibility for active
            // tenant execution context.
            //
            // The event carries the Membership and tenant that are no longer
            // eligible so downstream projections and reactions can remove the
            // selected context deterministically.
            // -----------------------------------------------------------------

            const contextClearedPayload = {
                identityId:
                    membership.identityId,

                membershipId:
                    membership.membershipId,

                tenantId:
                    membership.tenantId,

                reason:
                    "membership_suspended" as const,

                clearedAt:
                    now,

                occurredAt:
                    now,
            };

            // -----------------------------------------------------------------
            // COMMIT
            // -----------------------------------------------------------------
            // Folksdo Engine™ atomically persists:
            //   • the Membership state transition
            //   • the Membership-suspended event
            //   • the Membership-context-cleared event
            //   • the Membership-suspended outbox message
            //
            // The existing outbox contract is preserved. No unverified outbox
            // subject or dependency is introduced by this use case.
            // -----------------------------------------------------------------

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.membership",

                aggregateId:
                    membership.membershipId,

                stateChanges,

                events: [
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.membership",

                        aggregateId:
                            membership.membershipId,

                        eventType:
                            "membership.membership.suspended",

                        occurredAt:
                            now,

                        payload:
                            membershipSuspendedPayload,
                    }),

                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.context",

                        aggregateId:
                            membership.identityId,

                        eventType:
                            "membership.context.cleared",

                        occurredAt:
                            now,

                        payload:
                            contextClearedPayload,
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
                                .membershipSuspended,

                        occurredAt:
                            now,

                        payload:
                            membershipSuspendedPayload,
                    }),
                ],
            });

            return membership;
        },
    };
}