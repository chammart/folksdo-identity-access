// services/access/src/usecases/authorization-lifecycle/reactivate-membership-authorization-usecase.ts
// -----------------------------------------------------------------------------
// REACTIVATE MEMBERSHIP AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Restores Access-owned authorization associated with a reactivated Membership.
//
// Boundary:
//   • records the active Membership as an Access Known Fact
//   • restores role assignments suspended because of Membership lifecycle
//   • restores permission assignments suspended because of Membership lifecycle
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Membership authorization reactivation event
//
// This use case does not own:
//   • Membership lifecycle
//   • Identity lifecycle
//   • Tenant lifecycle
//   • role or permission definition
// -----------------------------------------------------------------------------

import {
    reactivateKnownMembership,
    restoreAssignmentForMembership,
} from "../../business-rules";

import type {
    KnownMembershipType,
} from "../../known-facts";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared";

import {
    assignmentChanges,
    commitLifecycle,
    knownFactChange,
    loadMembershipAssignments,
} from "./lifecycle-support";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ReactivateMembershipAuthorizationUseCaseRequest {
    readonly membershipId: string;
    readonly identityId: string;
    readonly tenantId: string;
    readonly membershipType: KnownMembershipType;
    readonly reason?: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ReactivateMembershipAuthorizationUseCaseResult {
    readonly membershipId: string;
    readonly status: "active";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ReactivateMembershipAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ReactivateMembershipAuthorizationUseCaseRequest,
    ): Promise<ReactivateMembershipAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentMembership =
            await this.dependencies.readStore.findKnownMembership(
                request.membershipId,
            );

        const currentAssignments =
            await loadMembershipAssignments(
                this.dependencies,
                request.membershipId,
            );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const nextMembership =
            reactivateKnownMembership(
                currentMembership,
                {
                    membershipId: request.membershipId,
                    identityId: request.identityId,
                    tenantId: request.tenantId,
                    membershipType: request.membershipType,
                },
                now,
            );

        const nextRoleAssignments =
            currentAssignments.roles.map(
                (assignment) =>
                    restoreAssignmentForMembership(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissions.map(
                (assignment) =>
                    restoreAssignmentForMembership(
                        assignment,
                        now,
                    ),
            );

        // ---------------------------------------------------------------------
        // BUILD ATOMIC STATE CHANGES
        // ---------------------------------------------------------------------

        const stateChanges: AccessStateChange[] = [];

        const membershipStateChange =
            knownFactChange(
                this.dependencies.collections
                    .knownMemberships,
                request.membershipId,
                currentMembership,
                nextMembership,
            );

        if (membershipStateChange) {
            stateChanges.push(
                membershipStateChange,
            );
        }

        const authorizationAssignmentChanges =
            assignmentChanges(
                this.dependencies,
                currentAssignments.roles,
                nextRoleAssignments,
                currentAssignments.permissions,
                nextPermissionAssignments,
            );

        stateChanges.push(
            ...authorizationAssignmentChanges,
        );

        // ---------------------------------------------------------------------
        // COMMIT ACCESS BUSINESS OUTCOME
        // ---------------------------------------------------------------------

        const changed = await commitLifecycle({
            dependencies: this.dependencies,
            aggregateType:
                "access.membership-authorization",
            aggregateId:
                request.membershipId,
            eventType:
                "access.membership_authorization.reactivated",
            subject:
                this.dependencies.outboxSubjects
                    .membershipAuthorizationReactivated,
            now,
            payload: {
                membershipId:
                    nextMembership.membershipId,
                identityId:
                    nextMembership.identityId,
                tenantId:
                    nextMembership.tenantId,
                membershipType:
                    nextMembership.membershipType,
                status:
                    nextMembership.status,
                occurredAt:
                    now,
                reason:
                    request.reason,
                sourceReference:
                    request.sourceReference,
                affectedAssignmentCount:
                    authorizationAssignmentChanges.length,
            },
            stateChanges,
        });

        // ---------------------------------------------------------------------
        // RESULT
        // ---------------------------------------------------------------------

        return {
            membershipId:
                nextMembership.membershipId,
            status: "active",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}