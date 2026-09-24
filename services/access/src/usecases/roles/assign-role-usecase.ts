// services/access/src/usecases/roles/assign-role-usecase.ts
// -----------------------------------------------------------------------------
// ASSIGN ROLE USE CASE
// -----------------------------------------------------------------------------
// Assigns an Access-owned Role to a Membership.
//
// Boundary:
//   • resolves the canonical Role through the Access read model
//   • validates the locally known Membership authorization context
//   • validates Role and Membership tenant-scope compatibility
//   • prevents duplicate active or pending Role assignments
//   • delegates assignment creation to the Access business rule
//   • commits state, event and outbox message atomically
//   • never calls Membership Operations™ synchronously
// -----------------------------------------------------------------------------

import {
    assignRole,
} from "../../business-rules";

import {
    AuthorizationContextInvalidError,
    MembershipAccessContextNotFoundError,
    RoleAssignmentAlreadyExistsError,
    RoleNotFoundError,
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

export interface AssignRoleRequest {
    readonly membershipId: string;

    readonly tenantId: string;

    readonly roleId: string;

    readonly assignedBy: string;

    readonly effectiveFrom?: string;

    readonly expiresAt?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class AssignRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: AssignRoleRequest,
    ): Promise<RoleAssignmentResult> {
        const role =
            await this.dependencies.readStore.findRoleById(
                request.roleId,
            );

        if (role === null) {
            throw new RoleNotFoundError(
                request.roleId,
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
                "Membership and Role assignment tenant scopes must match.",
            );
        }

        if (
            role.tenantId !== undefined &&
            role.tenantId !== request.tenantId
        ) {
            throw new AuthorizationContextInvalidError(
                "Tenant Role and Role assignment tenant scopes must match.",
            );
        }

        if (
            membership.status !== "active" &&
            membership.status !== "pending"
        ) {
            throw new AuthorizationContextInvalidError(
                "Membership is not eligible to receive a Role assignment.",
            );
        }

        const existingAssignment =
            await this.dependencies.readStore.findActiveRoleAssignment(
                request.membershipId,
                request.roleId,
                request.tenantId,
            );

        if (existingAssignment !== null) {
            throw new RoleAssignmentAlreadyExistsError(
                request.roleId,
                request.membershipId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const assignment =
            assignRole({
                assignmentId:
                    this.dependencies.ids.assignmentId(),

                membershipId:
                    request.membershipId,

                tenantId:
                    request.tenantId,

                role,

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
                    "access.role-assignment",

                aggregateId:
                    assignment.assignmentId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections.roleAssignments,

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
                            "access.role.assigned",

                        aggregateType:
                            "access.role-assignment",

                        aggregateId:
                            assignment.assignmentId,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                assignment.assignmentId,

                            membershipId:
                                assignment.membershipId,

                            roleId:
                                assignment.roleId,

                            tenantId:
                                assignment.tenantId,

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
                            this.dependencies.outboxSubjects.roleAssigned,

                        occurredAt:
                            now,

                        payload: {
                            assignmentId:
                                assignment.assignmentId,

                            membershipId:
                                assignment.membershipId,

                            roleId:
                                assignment.roleId,

                            tenantId:
                                assignment.tenantId,

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

        return toRoleAssignmentResult(
            assignment,
        );
    }
}