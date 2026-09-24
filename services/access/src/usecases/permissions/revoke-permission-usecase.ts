// services/access/src/usecases/permissions/revoke-permission-usecase.ts
// -----------------------------------------------------------------------------
// REVOKE PERMISSION USE CASE
// -----------------------------------------------------------------------------
// Revokes an existing direct Permission Assignment.
//
// Boundary:
//   • resolves canonical Permission Assignment state
//   • delegates lifecycle validation to the Access business rule
//   • preserves historical assignment state
//   • commits state, event and outbox message atomically
//   • does not physically delete Permission Assignment history
// -----------------------------------------------------------------------------

import {
    revokePermission,
} from "../../business-rules";

import {
    PermissionAssignmentNotFoundError,
} from "../../errors";

import {
    commitAccess,
} from "../shared/access-commit";

import {
    toPermissionAssignmentResult,
} from "../shared/access-results";

import type {
    PermissionAssignmentResult,
} from "../shared/access-results";

import type {
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface RevokePermissionRequest {
    readonly assignmentId: string;

    readonly revokedBy: string;

    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class RevokePermissionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: RevokePermissionRequest,
    ): Promise<PermissionAssignmentResult> {
        const existingAssignment =
            await this.dependencies.readStore.findPermissionAssignmentById(
                request.assignmentId,
            );

        if (existingAssignment === null) {
            throw new PermissionAssignmentNotFoundError(
                request.assignmentId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const revokedAssignment =
            revokePermission({
                assignment:
                    existingAssignment,

                revokedBy:
                    request.revokedBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.permission-assignment",

                aggregateId:
                    revokedAssignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.permissionAssignments,

                        documentId:
                            revokedAssignment.assignmentId,

                        patch: {
                            ...revokedAssignment,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.permission.revoked",

                        aggregateType:
                            "access.permission-assignment",

                        aggregateId:
                            revokedAssignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                revokedAssignment.assignmentId,

                            membershipId:
                                revokedAssignment.membershipId,

                            tenantId:
                                revokedAssignment.tenantId,

                            permissionId:
                                revokedAssignment.permissionId,

                            assignmentType:
                                revokedAssignment.assignmentType,

                            scope:
                                revokedAssignment.scope,

                            status:
                                revokedAssignment.status,

                            revokedAt:
                                revokedAssignment.revokedAt,

                            revokedBy:
                                revokedAssignment.revokedBy,

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
                            this.dependencies.outboxSubjects.permissionRevoked,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                revokedAssignment.assignmentId,

                            membershipId:
                                revokedAssignment.membershipId,

                            tenantId:
                                revokedAssignment.tenantId,

                            permissionId:
                                revokedAssignment.permissionId,

                            assignmentType:
                                revokedAssignment.assignmentType,

                            scope:
                                revokedAssignment.scope,

                            status:
                                revokedAssignment.status,

                            revokedAt:
                                revokedAssignment.revokedAt,

                            revokedBy:
                                revokedAssignment.revokedBy,

                            reason:
                                request.reason,
                        },
                    },
                ],
            },
        );

        return toPermissionAssignmentResult(
            revokedAssignment,
        );
    }
}