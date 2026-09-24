// services/access/src/usecases/remove-role-usecase.ts
// -----------------------------------------------------------------------------
// REMOVE ROLE USE CASE
// -----------------------------------------------------------------------------
// Removes an existing Role Assignment.
//
// Boundary:
//   • resolves canonical Role Assignment state
//   • delegates lifecycle validation to the Access business rule
//   • preserves historical assignment state
//   • commits state, event and outbox message atomically
//   • does not delete Role Assignment history
// -----------------------------------------------------------------------------

import {
    removeRole,
} from "../../business-rules";

import {
    RoleAssignmentNotFoundError,
} from "../../errors";

import {
    commitAccess,
} from "../shared/access-commit";

import {
    toRoleAssignmentResult,
} from "../shared/access-results";

import type {
    RoleAssignmentResult,
} from "../shared/access-results";

import type {
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface RemoveRoleRequest {
    readonly assignmentId: string;

    readonly removedBy: string;

    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class RemoveRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: RemoveRoleRequest,
    ): Promise<RoleAssignmentResult> {
        const existingAssignment =
            await this.dependencies.readStore.findRoleAssignmentById(
                request.assignmentId,
            );

        if (existingAssignment === null) {
            throw new RoleAssignmentNotFoundError(
                request.assignmentId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const removedAssignment =
            removeRole({
                assignment:
                    existingAssignment,

                removedBy:
                    request.removedBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role-assignment",

                aggregateId:
                    removedAssignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.roleAssignments,

                        documentId:
                            removedAssignment.assignmentId,

                        patch: {
                            ...removedAssignment,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role.removed",

                        aggregateType:
                            "access.role-assignment",

                        aggregateId:
                            removedAssignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                removedAssignment.assignmentId,

                            membershipId:
                                removedAssignment.membershipId,

                            roleId:
                                removedAssignment.roleId,

                            tenantId:
                                removedAssignment.tenantId,

                            removedBy:
                                request.removedBy,

                            removedAt:
                                removedAssignment.removedAt,

                            reason:
                                request.reason,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.roleRemoved,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                removedAssignment.assignmentId,

                            membershipId:
                                removedAssignment.membershipId,

                            roleId:
                                removedAssignment.roleId,

                            tenantId:
                                removedAssignment.tenantId,

                            status:
                                removedAssignment.status,

                            removedAt:
                                removedAssignment.removedAt,

                            removedBy:
                                request.removedBy,
                        },
                    },
                ],
            },
        );

        return toRoleAssignmentResult(
            removedAssignment,
        );
    }
}