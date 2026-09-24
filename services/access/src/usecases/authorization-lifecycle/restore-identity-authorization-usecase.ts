// services/access/src/usecases/authorization-lifecycle/restore-identity-authorization-usecase.ts
// -----------------------------------------------------------------------------
// RESTORE IDENTITY AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Restores Access-owned authorization associated with a restored Identity.
//
// Boundary:
//   • records the active Identity as an Access Known Fact
//   • restores role assignments suspended because of Identity lifecycle
//   • restores permission assignments suspended because of Identity lifecycle
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Identity authorization restoration event
//
// This use case does not own:
//   • Identity lifecycle
//   • authentication
//   • credentials
//   • sessions
//   • Membership lifecycle
// -----------------------------------------------------------------------------

import {
    restoreAssignmentForIdentity,
    restoreKnownIdentity,
} from "../../business-rules";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared";

import {
    assignmentChanges,
    commitLifecycle,
    knownFactChange,
    loadIdentityAssignments,
} from "./lifecycle-support";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface RestoreIdentityAuthorizationUseCaseRequest {
    readonly identityId: string;
    readonly reason?: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface RestoreIdentityAuthorizationUseCaseResult {
    readonly identityId: string;
    readonly status: "active";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class RestoreIdentityAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: RestoreIdentityAuthorizationUseCaseRequest,
    ): Promise<RestoreIdentityAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentIdentity =
            await this.dependencies.readStore.findKnownIdentity(
                request.identityId,
            );

        const currentAssignments =
            await loadIdentityAssignments(
                this.dependencies,
                request.identityId,
            );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const nextIdentity = restoreKnownIdentity(
            currentIdentity,
            request.identityId,
            now,
        );

        const nextRoleAssignments =
            currentAssignments.roles.map(
                (assignment) =>
                    restoreAssignmentForIdentity(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissions.map(
                (assignment) =>
                    restoreAssignmentForIdentity(
                        assignment,
                        now,
                    ),
            );

        // ---------------------------------------------------------------------
        // BUILD ATOMIC STATE CHANGES
        // ---------------------------------------------------------------------

        const stateChanges: AccessStateChange[] = [];

        const identityStateChange = knownFactChange(
            this.dependencies.collections.knownIdentities,
            request.identityId,
            currentIdentity,
            nextIdentity,
        );

        if (identityStateChange) {
            stateChanges.push(identityStateChange);
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
            aggregateType: "access.identity-authorization",
            aggregateId: request.identityId,
            eventType: "access.identity_access.restored",
            subject:
                this.dependencies.outboxSubjects
                    .identityAccessRestored,
            now,
            payload: {
                identityId: nextIdentity.identityId,
                status: nextIdentity.status,
                occurredAt: now,
                reason: request.reason,
                sourceReference: request.sourceReference,
                affectedAssignmentCount:
                    authorizationAssignmentChanges.length,
            },
            stateChanges,
        });

        // ---------------------------------------------------------------------
        // RESULT
        // ---------------------------------------------------------------------

        return {
            identityId: nextIdentity.identityId,
            status: "active",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}