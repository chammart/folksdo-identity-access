// services/access/src/usecases/expirations/expire-assignment-usecase.ts
// -----------------------------------------------------------------------------
// EXPIRE ACCESS ASSIGNMENT USE CASE
// -----------------------------------------------------------------------------
// Expires an Access-owned Role or Permission Assignment whose expiration
// boundary has been reached.
//
// Boundary:
//   • resolves canonical Assignment state
//   • delegates expiration validation and mutation to Access business rules
//   • commits canonical state, event and outbox message atomically
//   • preserves historical Assignment state
//   • prevents expired Assignments from participating in authorization
//   • remains safe for worker-driven execution
// -----------------------------------------------------------------------------

import {
    expireAssignment,
} from "../../business-rules";

import {
    PermissionAssignmentNotFoundError,
    RoleAssignmentNotFoundError,
} from "../../errors";

import {
    commitAccess,
    toPermissionAssignmentResult,
    toRoleAssignmentResult,
} from "../shared";

import type {
    AccessUseCaseDependencies,
    PermissionAssignmentResult,
    RoleAssignmentResult,
} from "../shared";

// -----------------------------------------------------------------------------
// ASSIGNMENT TYPE
// -----------------------------------------------------------------------------

export type ExpirableAssignmentType =
    | "role"
    | "permission";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ExpireAssignmentRequest {
    readonly assignmentType:
    ExpirableAssignmentType;

    readonly assignmentId: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export type ExpireAssignmentResult =
    | {
        readonly assignmentType: "role";

        readonly assignment:
        RoleAssignmentResult;
    }
    | {
        readonly assignmentType: "permission";

        readonly assignment:
        PermissionAssignmentResult;
    };

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ExpireAssignmentUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ExpireAssignmentRequest,
    ): Promise<ExpireAssignmentResult> {
        if (request.assignmentType === "role") {
            return this.expireRoleAssignment(
                request.assignmentId,
            );
        }

        return this.expirePermissionAssignment(
            request.assignmentId,
        );
    }

    // -------------------------------------------------------------------------
    // ROLE ASSIGNMENT EXPIRATION
    // -------------------------------------------------------------------------

    private async expireRoleAssignment(
        assignmentId: string,
    ): Promise<ExpireAssignmentResult> {
        const existingAssignment =
            await this.dependencies.readStore
                .findRoleAssignmentById(
                    assignmentId,
                );

        if (existingAssignment === null) {
            throw new RoleAssignmentNotFoundError(
                assignmentId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const expiredAssignment =
            expireAssignment({
                assignment:
                    existingAssignment,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role-assignment",

                aggregateId:
                    expiredAssignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .roleAssignments,

                        documentId:
                            expiredAssignment.assignmentId,

                        patch: {
                            ...expiredAssignment,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role-assignment.expired",

                        aggregateType:
                            "access.role-assignment",

                        aggregateId:
                            expiredAssignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                expiredAssignment.assignmentId,

                            roleId:
                                expiredAssignment.roleId,

                            membershipId:
                                expiredAssignment.membershipId,

                            tenantId:
                                expiredAssignment.tenantId,

                            status:
                                expiredAssignment.status,

                            effectiveFrom:
                                expiredAssignment.effectiveFrom,

                            expiresAt:
                                expiredAssignment.expiresAt,

                            expiredAt:
                                expiredAssignment.expiredAt,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects
                                .assignmentExpired,

                        occurredAt:
                            now,

                        payload: {
                            assignmentType:
                                "role",

                            assignmentId:
                                expiredAssignment.assignmentId,

                            roleId:
                                expiredAssignment.roleId,

                            membershipId:
                                expiredAssignment.membershipId,

                            tenantId:
                                expiredAssignment.tenantId,

                            status:
                                expiredAssignment.status,

                            effectiveFrom:
                                expiredAssignment.effectiveFrom,

                            expiresAt:
                                expiredAssignment.expiresAt,

                            expiredAt:
                                expiredAssignment.expiredAt,
                        },
                    },
                ],
            },
        );

        return {
            assignmentType:
                "role",

            assignment:
                toRoleAssignmentResult(
                    expiredAssignment,
                ),
        };
    }

    // -------------------------------------------------------------------------
    // PERMISSION ASSIGNMENT EXPIRATION
    // -------------------------------------------------------------------------

    private async expirePermissionAssignment(
        assignmentId: string,
    ): Promise<ExpireAssignmentResult> {
        const existingAssignment =
            await this.dependencies.readStore
                .findPermissionAssignmentById(
                    assignmentId,
                );

        if (existingAssignment === null) {
            throw new PermissionAssignmentNotFoundError(
                assignmentId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const expiredAssignment =
            expireAssignment({
                assignment:
                    existingAssignment,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.permission-assignment",

                aggregateId:
                    expiredAssignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections
                                .permissionAssignments,

                        documentId:
                            expiredAssignment.assignmentId,

                        patch: {
                            ...expiredAssignment,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.permission-assignment.expired",

                        aggregateType:
                            "access.permission-assignment",

                        aggregateId:
                            expiredAssignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                expiredAssignment.assignmentId,

                            permissionId:
                                expiredAssignment.permissionId,

                            membershipId:
                                expiredAssignment.membershipId,

                            tenantId:
                                expiredAssignment.tenantId,

                            assignmentType:
                                expiredAssignment.assignmentType,

                            scope:
                                expiredAssignment.scope,

                            status:
                                expiredAssignment.status,

                            effectiveFrom:
                                expiredAssignment.effectiveFrom,

                            expiresAt:
                                expiredAssignment.expiresAt,

                            expiredAt:
                                expiredAssignment.expiredAt,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects
                                .assignmentExpired,

                        occurredAt:
                            now,

                        payload: {
                            assignmentType:
                                "permission",

                            assignmentId:
                                expiredAssignment.assignmentId,

                            permissionId:
                                expiredAssignment.permissionId,

                            membershipId:
                                expiredAssignment.membershipId,

                            tenantId:
                                expiredAssignment.tenantId,

                            permissionAssignmentType:
                                expiredAssignment.assignmentType,

                            scope:
                                expiredAssignment.scope,

                            status:
                                expiredAssignment.status,

                            effectiveFrom:
                                expiredAssignment.effectiveFrom,

                            expiresAt:
                                expiredAssignment.expiresAt,

                            expiredAt:
                                expiredAssignment.expiredAt,
                        },
                    },
                ],
            },
        );

        return {
            assignmentType:
                "permission",

            assignment:
                toPermissionAssignmentResult(
                    expiredAssignment,
                ),
        };
    }
}