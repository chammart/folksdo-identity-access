// services/access/src/usecases/authorization-lifecycle/activate-membership-authorization-usecase.ts
// -----------------------------------------------------------------------------
// ACTIVATE MEMBERSHIP AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Activates Access-owned authorization eligibility for a Membership.
//
// Boundary:
//   • owns the Access response to Membership activation
//   • records the latest Membership Known Fact
//   • restores assignments suspended by Membership lifecycle enforcement
//   • commits all Access-owned changes atomically through Folksdo Engine™
//   • emits the completed Access authorization lifecycle event
//
// This use case does not own:
//   • Membership lifecycle
//   • Membership context resolution
//   • Identity lifecycle
//   • Tenant lifecycle
// -----------------------------------------------------------------------------

import {
    activateKnownMembership,
    restoreAssignmentForMembership,
} from "../../business-rules";

import type { KnownMembershipType } from "../../known-facts";

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

export interface ActivateMembershipAuthorizationUseCaseRequest {
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

export interface ActivateMembershipAuthorizationUseCaseResult {
    readonly membershipId: string;
    readonly status: "active";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ActivateMembershipAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ActivateMembershipAuthorizationUseCaseRequest,
    ): Promise<ActivateMembershipAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentMembership =
            await this.dependencies.readStore.findKnownMembership(
                request.membershipId,
            );

        const currentAssignments = await loadMembershipAssignments(
            this.dependencies,
            request.membershipId,
        );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const membershipSeed = {
            membershipId: request.membershipId,
            identityId: request.identityId,
            tenantId: request.tenantId,
            membershipType: request.membershipType,
        };

        const nextMembership = activateKnownMembership(
            currentMembership,
            membershipSeed,
            now,
        );

        const nextRoleAssignments = currentAssignments.roles.map(
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

        const membershipStateChange = knownFactChange(
            this.dependencies.collections.knownMemberships,
            request.membershipId,
            currentMembership,
            nextMembership,
        );

        if (membershipStateChange) {
            stateChanges.push(membershipStateChange);
        }

        const authorizationAssignmentChanges = assignmentChanges(
            this.dependencies,
            currentAssignments.roles,
            nextRoleAssignments,
            currentAssignments.permissions,
            nextPermissionAssignments,
        );

        stateChanges.push(...authorizationAssignmentChanges);

        // ---------------------------------------------------------------------
        // COMMIT ACCESS BUSINESS OUTCOME
        // ---------------------------------------------------------------------

        const changed = await commitLifecycle({
            dependencies: this.dependencies,
            aggregateType: "access.membership-authorization",
            aggregateId: request.membershipId,
            eventType: "access.membership_authorization.activated",
            subject:
                this.dependencies.outboxSubjects
                    .membershipAuthorizationActivated,
            now,
            payload: {
                membershipId: request.membershipId,
                identityId: request.identityId,
                tenantId: request.tenantId,
                status: "active",
                occurredAt: now,
                reason: request.reason,
                sourceReference: request.sourceReference,
            },
            stateChanges,
        });

        // ---------------------------------------------------------------------
        // RESULT
        // ---------------------------------------------------------------------

        return {
            membershipId: request.membershipId,
            status: "active",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}