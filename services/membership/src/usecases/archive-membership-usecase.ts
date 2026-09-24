// services/membership/src/usecases/archive-membership-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE MEMBERSHIP USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Archive Membership™.
//
// Purpose:
//   • load the Membership aggregate
//   • apply the explicit Membership archival business rule
//   • prepare the replayable archival event
//   • prepare the matching outbox message
//   • commit state, event, and outbox atomically through Folksdo Engine™
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    ArchiveMembershipRequest,
    MembershipResult,
} from "../api";

import {
    archiveMembership,
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

export interface ArchiveMembershipUseCase {
    execute(
        membershipId: string,
        input: ArchiveMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createArchiveMembershipUseCase(
    dependencies: MembershipMutationDependencies,
): ArchiveMembershipUseCase {
    return {
        async execute(
            membershipId: string,
            input: ArchiveMembershipRequest,
            context: RuntimeContext,
        ): Promise<MembershipResult> {
            const currentMembership =
                await dependencies
                    .readStore
                    .findMembershipById(
                        membershipId,
                    );

            if (!currentMembership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            const now =
                dependencies.clock.nowTimestamp();

            const membership = archiveMembership({
                membership: currentMembership,
                reason: input.reason,
                now,
            });

            const payload = {
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

                archiveReason:
                    membership.archiveReason,

                archivedAt:
                    membership.archivedAt,

                occurredAt:
                    now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation: "update",

                    collection:
                        dependencies
                            .collections
                            .memberships,

                    key: {
                        membershipId:
                            membership.membershipId,
                    },

                    patch: {
                        status:
                            membership.status,

                        archivedAt:
                            membership.archivedAt,

                        archiveReason:
                            membership.archiveReason,

                        suspensionReason:
                            membership.suspensionReason,

                        suspensionSource:
                            membership.suspensionSource,

                        updatedAt:
                            membership.updatedAt,
                    },
                },
            ];

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
                            "membership.membership.archived",

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
                                .membershipArchived,

                        occurredAt:
                            now,

                        payload,
                    }),
                ],
            });

            return membership;
        },
    };
}