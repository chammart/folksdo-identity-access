// services/access/src/usecases/authorization-lifecycle/suspend-membership-authorization-usecase.ts
// -----------------------------------------------------------------------------
// SUSPEND MEMBERSHIP AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Suspends Access-owned authorization associated with a suspended Membership.
//
// Boundary:
//   • records the suspended Membership as an Access Known Fact
//   • suspends role assignments because of Membership lifecycle
//   • suspends permission assignments because of Membership lifecycle
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Membership authorization suspension event
//
// This use case does not own:
//   • Membership lifecycle
//   • Identity lifecycle
//   • Tenant lifecycle
//   • role or permission definition
// -----------------------------------------------------------------------------

import {
    suspendAssignmentForMembership,
    suspendKnownMembership,
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

export interface SuspendMembershipAuthorizationUseCaseRequest {
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

export interface SuspendMembershipAuthorizationUseCaseResult {
    readonly membershipId: string;
    readonly status: "suspended";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class SuspendMembershipAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: SuspendMembershipAuthorizationUseCaseRequest,
    ): Promise<SuspendMembershipAuthorizationUseCaseResult> {
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
            suspendKnownMembership(
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
                    suspendAssignmentForMembership(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissions.map(
                (assignment) =>
                    suspendAssignmentForMembership(
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
                "access.membership_authorization.suspended",
            subject:
                this.dependencies.outboxSubjects
                    .membershipAuthorizationSuspended,
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
            status: "suspended",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}