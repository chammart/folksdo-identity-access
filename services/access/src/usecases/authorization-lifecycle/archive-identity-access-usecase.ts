// services/access/src/usecases/authorization-lifecycle/archive-identity-access-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE IDENTITY ACCESS USE CASE
// -----------------------------------------------------------------------------
// Permanently archives Access-owned authorization associated with an Identity.
//
// Boundary:
//   • owns the Access response to Identity archival
//   • archives the Identity Known Fact
//   • archives role and permission assignments owned by the Identity
//   • preserves complete authorization history
//   • commits all Access-owned changes atomically through Folksdo Engine™
//   • emits the completed Access authorization lifecycle event
//
// This use case does not own:
//   • Identity lifecycle
//   • authentication
//   • credentials
//   • sessions
//   • Membership lifecycle
// -----------------------------------------------------------------------------

import {
    archiveAssignmentForIdentity,
    archiveKnownIdentity,
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

export interface ArchiveIdentityAccessUseCaseRequest {
    readonly identityId: string;
    readonly reason?: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ArchiveIdentityAccessUseCaseResult {
    readonly identityId: string;
    readonly status: "archived";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ArchiveIdentityAccessUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ArchiveIdentityAccessUseCaseRequest,
    ): Promise<ArchiveIdentityAccessUseCaseResult> {
        const now = this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentIdentity =
            await this.dependencies.readStore.findKnownIdentity(
                request.identityId,
            );

        const currentAssignments = await loadIdentityAssignments(
            this.dependencies,
            request.identityId,
        );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const nextIdentity = archiveKnownIdentity(
            currentIdentity,
            request.identityId,
            now,
        );

        const nextRoleAssignments =
            currentAssignments.roles.map(
                (assignment) =>
                    archiveAssignmentForIdentity(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissions.map(
                (assignment) =>
                    archiveAssignmentForIdentity(
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
            eventType: "access.identity_access.archived",
            subject:
                this.dependencies.outboxSubjects
                    .identityAccessArchived,
            now,
            payload: {
                identityId: request.identityId,
                status: "archived",
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
            identityId: request.identityId,
            status: "archived",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}