// services/membership/src/usecases/switch-membership-context-usecase.ts
// -----------------------------------------------------------------------------
// SWITCH MEMBERSHIP CONTEXT USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Switch Membership Context™.
//
// Purpose:
//   • resolve the Membership selected by the authenticated Identity
//   • verify that the Membership belongs to that Identity
//   • verify that the Membership is active
//   • establish the active tenant execution context
//   • emit the replayable Membership-context-changed event
//   • publish the corresponding outbox message
//   • commit state, event, and outbox atomically through Folksdo Engine™
//
// Boundary:
//   • Identity Operations™ establishes the authenticated Identity
//   • Membership Operations™ establishes tenant participation context
//   • Access Operations™ resolves authorization within that context
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    MembershipContextResult,
    SwitchMembershipContextRequest,
} from "../api";

import {
    MembershipNotEligibleError,
    MembershipNotFoundError,
} from "../errors";

import {
    createMembershipEvent,
    createMembershipOutboxMessage,
} from "../events";

import type {
    MembershipContextState,
} from "../state";

import {
    commitMembership,
} from "./membership-commit";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface SwitchMembershipContextUseCase {
    execute(
        identityId: string,
        input: SwitchMembershipContextRequest,
        context: RuntimeContext,
    ): Promise<MembershipContextResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createSwitchMembershipContextUseCase(
    dependencies: MembershipMutationDependencies,
): SwitchMembershipContextUseCase {
    return {
        async execute(
            identityId: string,
            input: SwitchMembershipContextRequest,
            context: RuntimeContext,
        ): Promise<MembershipContextResult> {
            // -----------------------------------------------------------------
            // RESOLVE MEMBERSHIP
            // -----------------------------------------------------------------

            const membership =
                await dependencies.readStore.findMembershipById(
                    input.membershipId,
                );

            if (!membership) {
                throw new MembershipNotFoundError(
                    input.membershipId,
                );
            }

            // -----------------------------------------------------------------
            // VALIDATE MEMBERSHIP OWNERSHIP
            // -----------------------------------------------------------------

            if (membership.identityId !== identityId) {
                throw new MembershipNotEligibleError(
                    membership.membershipId,
                    "Membership does not belong to the authenticated Identity.",
                );
            }

            // -----------------------------------------------------------------
            // VALIDATE MEMBERSHIP STATUS
            // -----------------------------------------------------------------

            if (membership.status !== "active") {
                throw new MembershipNotEligibleError(
                    membership.membershipId,
                    `Membership status is ${membership.status}.`,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            // -----------------------------------------------------------------
            // BUILD ACTIVE MEMBERSHIP CONTEXT
            // -----------------------------------------------------------------

            const selectedContext: MembershipContextState = {
                identityId,

                activeMembershipId:
                    membership.membershipId,

                activeTenantId:
                    membership.tenantId,

                activatedAt:
                    now,

                updatedAt:
                    now,
            };

            // -----------------------------------------------------------------
            // PREPARE STATE CHANGE
            // -----------------------------------------------------------------

            const stateChanges: StateChange[] = [
                {
                    operation:
                        "upsert",

                    collection:
                        dependencies.collections.contexts,

                    key: {
                        identityId:
                            selectedContext.identityId,
                    },

                    document: {
                        identityId:
                            selectedContext.identityId,

                        activeMembershipId:
                            selectedContext.activeMembershipId,

                        activeTenantId:
                            selectedContext.activeTenantId,

                        activatedAt:
                            selectedContext.activatedAt,

                        updatedAt:
                            selectedContext.updatedAt,
                    },
                },
            ];

            // -----------------------------------------------------------------
            // PREPARE EVENT PAYLOAD
            // -----------------------------------------------------------------

            const payload = {
                identityId:
                    selectedContext.identityId,

                membershipId:
                    selectedContext.activeMembershipId,

                tenantId:
                    selectedContext.activeTenantId,

                activatedAt:
                    selectedContext.activatedAt,

                occurredAt:
                    now,
            };

            // -----------------------------------------------------------------
            // COMMIT
            // -----------------------------------------------------------------

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.context",

                aggregateId:
                    selectedContext.identityId,

                stateChanges,

                events: [
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.context",

                        aggregateId:
                            selectedContext.identityId,

                        eventType:
                            "membership.context.changed",

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
                                .contextChanged,

                        occurredAt:
                            now,

                        payload,
                    }),
                ],
            });

            return selectedContext;
        },
    };
}