// services/access/src/usecases/authorization-lifecycle/archive-tenant-authorization-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE TENANT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Archives Access-owned authorization associated with an archived Tenant.
//
// Boundary:
//   • records the archived Tenant as an Access Known Fact
//   • archives role assignments associated with the Tenant
//   • archives direct permission assignments associated with the Tenant
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Tenant authorization archival event
//
// This use case does not own:
//   • Tenant lifecycle
//   • Membership lifecycle
//   • Identity lifecycle
//   • Subscription lifecycle
// -----------------------------------------------------------------------------

import {
    archiveAssignmentForTenant,
    archiveKnownTenant,
} from "../../business-rules";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared";

import {
    assignmentChanges,
    commitLifecycle,
    knownFactChange,
} from "./lifecycle-support";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ArchiveTenantAuthorizationUseCaseRequest {
    readonly tenantId: string;
    readonly reason?: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ArchiveTenantAuthorizationUseCaseResult {
    readonly tenantId: string;
    readonly status: "archived";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ArchiveTenantAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ArchiveTenantAuthorizationUseCaseRequest,
    ): Promise<ArchiveTenantAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentTenant =
            await this.dependencies.readStore.findKnownTenant(
                request.tenantId,
            );

        const currentAssignments =
            await this.dependencies.readStore.listAssignmentsByTenant(
                request.tenantId,
            );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const nextTenant = archiveKnownTenant(
            currentTenant,
            request.tenantId,
            now,
        );

        const nextRoleAssignments =
            currentAssignments.roleAssignments.map(
                (assignment) =>
                    archiveAssignmentForTenant(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissionAssignments.map(
                (assignment) =>
                    archiveAssignmentForTenant(
                        assignment,
                        now,
                    ),
            );

        // ---------------------------------------------------------------------
        // BUILD ATOMIC STATE CHANGES
        // ---------------------------------------------------------------------

        const stateChanges: AccessStateChange[] = [];

        const tenantStateChange = knownFactChange(
            this.dependencies.collections.knownTenants,
            request.tenantId,
            currentTenant,
            nextTenant,
        );

        if (tenantStateChange) {
            stateChanges.push(tenantStateChange);
        }

        const authorizationAssignmentChanges =
            assignmentChanges(
                this.dependencies,
                currentAssignments.roleAssignments,
                nextRoleAssignments,
                currentAssignments.permissionAssignments,
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
            aggregateType: "access.tenant-authorization",
            aggregateId: request.tenantId,
            eventType:
                "access.tenant_authorization.archived",
            subject:
                this.dependencies.outboxSubjects
                    .tenantAuthorizationArchived,
            now,
            payload: {
                tenantId: request.tenantId,
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
            tenantId: request.tenantId,
            status: "archived",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}