// services/membership/src/usecases/create-membership-usecase.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Create Membership™.
//
// Purpose:
//   • validate that the Identity does not already participate in the Tenant
//   • create canonical Membership state
//   • prepare replayable Membership lifecycle events
//   • prepare matching outbox messages
//   • commit state, events, and outbox atomically through Folksdo Engine™
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    CreateMembershipRequest,
    MembershipResult,
} from "../api";

import {
    createMembership,
} from "../business-rules";

import {
    MembershipAlreadyExistsError,
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

export interface CreateMembershipUseCase {
    execute(
        input: CreateMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createCreateMembershipUseCase(
    dependencies: MembershipMutationDependencies,
): CreateMembershipUseCase {
    return {
        async execute(
            input: CreateMembershipRequest,
            context: RuntimeContext,
        ): Promise<MembershipResult> {
            const existingMembership =
                await dependencies
                    .readStore
                    .findMembership(
                        input.identityId,
                        input.tenantId,
                    );

            if (existingMembership) {
                throw new MembershipAlreadyExistsError(
                    input.identityId,
                    input.tenantId,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            const membership = createMembership({
                membershipId:
                    dependencies.ids.createMembershipId(),

                identityId:
                    input.identityId,

                tenantId:
                    input.tenantId,

                membershipType:
                    input.membershipType,

                active:
                    input.activate,

                now,
            });

            const createdPayload = {
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

                createdAt:
                    membership.createdAt,

                occurredAt:
                    now,
            };

            const activatedPayload = {
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

                occurredAt:
                    now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation: "insert",

                    collection:
                        dependencies
                            .collections
                            .memberships,

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

                        sourceInvitationId:
                            membership.sourceInvitationId,

                        activatedAt:
                            membership.activatedAt,

                        suspendedAt:
                            membership.suspendedAt,

                        suspensionReason:
                            membership.suspensionReason,

                        reactivatedAt:
                            membership.reactivatedAt,

                        archivedAt:
                            membership.archivedAt,

                        archiveReason:
                            membership.archiveReason,

                        createdAt:
                            membership.createdAt,

                        updatedAt:
                            membership.updatedAt,
                    },
                },
            ];

            const events = [
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
                        createdPayload,
                }),
            ];

            const outbox = [
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
                        createdPayload,
                }),
            ];

            if (membership.status === "active") {
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
                            "membership.membership.activated",

                        occurredAt:
                            now,

                        payload:
                            activatedPayload,
                    }),
                );

                outbox.push(
                    createMembershipOutboxMessage({
                        ids:
                            dependencies.ids,

                        context,

                        subject:
                            dependencies
                                .outboxSubjects
                                .membershipActivated,

                        occurredAt:
                            now,

                        payload:
                            activatedPayload,
                    }),
                );
            }

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.membership",

                aggregateId:
                    membership.membershipId,

                stateChanges,

                events,

                outbox,
            });

            return membership;
        },
    };
}