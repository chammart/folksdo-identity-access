// services/access/src/usecases/permissions/grant-permission-usecase.ts
// -----------------------------------------------------------------------------
// GRANT PERMISSION USE CASE
// -----------------------------------------------------------------------------
// Creates a direct Permission grant or denial for a Membership.
//
// Boundary:
//   • resolves canonical Permission state
//   • validates the locally known Membership authorization context
//   • prevents duplicate direct Permission assignments
//   • delegates assignment creation to Access business rules
//   • preserves Tenant and resource scope
//   • commits state, event and outbox message atomically
//   • never calls Membership Operations™ synchronously
// -----------------------------------------------------------------------------

import {
    grantPermission,
} from "../../business-rules";

import {
    AuthorizationContextInvalidError,
    MembershipAccessContextNotFoundError,
    PermissionAssignmentAlreadyExistsError,
    PermissionNotFoundError,
} from "../../errors";

import type {
    PermissionAssignmentScope,
    PermissionAssignmentType,
} from "../../state";

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

export interface GrantPermissionRequest {
    readonly membershipId: string;

    readonly tenantId: string;

    readonly permissionId: string;

    readonly assignmentType: PermissionAssignmentType;

    readonly scope: PermissionAssignmentScope;

    readonly assignedBy: string;

    readonly effectiveFrom?: string;

    readonly expiresAt?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class GrantPermissionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: GrantPermissionRequest,
    ): Promise<PermissionAssignmentResult> {
        const permission =
            await this.dependencies.readStore.findPermissionById(
                request.permissionId,
            );

        if (permission === null) {
            throw new PermissionNotFoundError(
                request.permissionId,
            );
        }

        const membership =
            await this.dependencies.knownFactsStore.findMembership(
                request.membershipId,
            );

        if (membership === null) {
            throw new MembershipAccessContextNotFoundError(
                request.membershipId,
            );
        }

        if (membership.tenantId !== request.tenantId) {
            throw new AuthorizationContextInvalidError(
                "Membership and Permission assignment tenant scopes must match.",
            );
        }

        if (
            membership.status !== "active" &&
            membership.status !== "pending"
        ) {
            throw new AuthorizationContextInvalidError(
                "Membership is not eligible to receive a Permission assignment.",
            );
        }

        const existingAssignment =
            await this.dependencies.readStore.findActivePermissionAssignment(
                request.membershipId,
                request.permissionId,
                request.tenantId,
            );

        if (existingAssignment !== null) {
            throw new PermissionAssignmentAlreadyExistsError(
                request.permissionId,
                request.membershipId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const assignment =
            grantPermission({
                assignmentId:
                    this.dependencies.ids.assignmentId(),

                membershipId:
                    request.membershipId,

                tenantId:
                    request.tenantId,

                permission,

                assignmentType:
                    request.assignmentType,

                scope:
                    request.scope,

                membershipIsActive:
                    membership.status === "active",

                assignedBy:
                    request.assignedBy,

                effectiveFrom:
                    request.effectiveFrom ?? now,

                expiresAt:
                    request.expiresAt,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.permission-assignment",

                aggregateId:
                    assignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections.permissionAssignments,

                        document: {
                            ...assignment,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.permission.granted",

                        aggregateType:
                            "access.permission-assignment",

                        aggregateId:
                            assignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                assignment.assignmentId,

                            membershipId:
                                assignment.membershipId,

                            tenantId:
                                assignment.tenantId,

                            permissionId:
                                assignment.permissionId,

                            assignmentType:
                                assignment.assignmentType,

                            scope:
                                assignment.scope,

                            status:
                                assignment.status,

                            assignedBy:
                                assignment.assignedBy,

                            effectiveFrom:
                                assignment.effectiveFrom,

                            activatedAt:
                                assignment.activatedAt,

                            expiresAt:
                                assignment.expiresAt,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.permissionGranted,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                assignment.assignmentId,

                            membershipId:
                                assignment.membershipId,

                            tenantId:
                                assignment.tenantId,

                            permissionId:
                                assignment.permissionId,

                            assignmentType:
                                assignment.assignmentType,

                            scope:
                                assignment.scope,

                            status:
                                assignment.status,

                            assignedBy:
                                assignment.assignedBy,

                            effectiveFrom:
                                assignment.effectiveFrom,

                            activatedAt:
                                assignment.activatedAt,

                            expiresAt:
                                assignment.expiresAt,
                        },
                    },
                ],
            },
        );

        return toPermissionAssignmentResult(
            assignment,
        );
    }
}