// services/access/src/usecases/authorization-lifecycle/suspend-tenant-authorization-usecase.ts
// -----------------------------------------------------------------------------
// SUSPEND TENANT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Suspends Access-owned authorization associated with a suspended Tenant.
//
// Boundary:
//   • records the suspended Tenant as an Access Known Fact
//   • suspends role assignments because of Tenant lifecycle
//   • suspends permission assignments because of Tenant lifecycle
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Tenant authorization suspension event
//
// This use case does not own:
//   • Tenant lifecycle
//   • Membership lifecycle
//   • Identity lifecycle
//   • Subscription lifecycle
// -----------------------------------------------------------------------------

import {
    suspendAssignmentForTenant,
    suspendKnownTenant,
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

export interface SuspendTenantAuthorizationUseCaseRequest {
    readonly tenantId: string;
    readonly reason?: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface SuspendTenantAuthorizationUseCaseResult {
    readonly tenantId: string;
    readonly status: "suspended";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class SuspendTenantAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: SuspendTenantAuthorizationUseCaseRequest,
    ): Promise<SuspendTenantAuthorizationUseCaseResult> {
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

        const nextTenant = suspendKnownTenant(
            currentTenant,
            request.tenantId,
            now,
        );

        const nextRoleAssignments =
            currentAssignments.roleAssignments.map(
                (assignment) =>
                    suspendAssignmentForTenant(
                        assignment,
                        now,
                    ),
            );

        const nextPermissionAssignments =
            currentAssignments.permissionAssignments.map(
                (assignment) =>
                    suspendAssignmentForTenant(
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
                "access.tenant_authorization.suspended",
            subject:
                this.dependencies.outboxSubjects
                    .tenantAuthorizationSuspended,
            now,
            payload: {
                tenantId: nextTenant.tenantId,
                status: nextTenant.status,
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
            tenantId: nextTenant.tenantId,
            status: "suspended",
            changed,
            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}