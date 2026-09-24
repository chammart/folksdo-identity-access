// services/access/src/usecases/authorization-lifecycle/reactivate-tenant-authorization-usecase.ts
// -----------------------------------------------------------------------------
// REACTIVATE TENANT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Reactivates Access-owned authorization associated with a reactivated Tenant.
//
// Boundary:
//   • records the active Tenant as an Access Known Fact
//   • reactivates role assignments suspended because of Tenant lifecycle
//   • reactivates permission assignments suspended because of Tenant lifecycle
//   • commits the complete Access lifecycle outcome atomically
//   • emits the completed Tenant authorization reactivation event
//
// This use case does not own:
//   • Tenant lifecycle
//   • Membership lifecycle
//   • Identity lifecycle
//   • Subscription lifecycle
// -----------------------------------------------------------------------------

import {
    reactivateAssignmentForTenant,
    reactivateKnownTenant,
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

export interface ReactivateTenantAuthorizationUseCaseRequest {
    readonly tenantId:
    string;

    readonly sourceReference?:
    string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ReactivateTenantAuthorizationUseCaseResult {
    readonly tenantId:
    string;

    readonly status:
    "active";

    readonly changed:
    boolean;

    readonly affectedAssignmentCount:
    number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ReactivateTenantAuthorizationUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request:
            ReactivateTenantAuthorizationUseCaseRequest,
    ): Promise<
        ReactivateTenantAuthorizationUseCaseResult
    > {
        const now =
            this.dependencies.clock.now();

        // ---------------------------------------------------------------------
        // LOAD CURRENT ACCESS STATE
        // ---------------------------------------------------------------------

        const currentTenant =
            await this.dependencies
                .readStore
                .findKnownTenant(
                    request.tenantId,
                );

        const currentAssignments =
            await this.dependencies
                .readStore
                .listAssignmentsByTenant(
                    request.tenantId,
                );

        // ---------------------------------------------------------------------
        // APPLY ACCESS BUSINESS RULES
        // ---------------------------------------------------------------------

        const nextTenant =
            reactivateKnownTenant(
                currentTenant,
                request.tenantId,
                now,
            );

        const nextRoleAssignments =
            currentAssignments
                .roleAssignments
                .map(
                    assignment =>
                        reactivateAssignmentForTenant(
                            assignment,
                            now,
                        ),
                );

        const nextPermissionAssignments =
            currentAssignments
                .permissionAssignments
                .map(
                    assignment =>
                        reactivateAssignmentForTenant(
                            assignment,
                            now,
                        ),
                );

        // ---------------------------------------------------------------------
        // BUILD ATOMIC STATE CHANGES
        // ---------------------------------------------------------------------

        const stateChanges:
            AccessStateChange[] = [];

        const tenantStateChange =
            knownFactChange(
                this.dependencies
                    .collections
                    .knownTenants,

                request.tenantId,

                currentTenant,

                nextTenant,
            );

        if (
            tenantStateChange
        ) {
            stateChanges.push(
                tenantStateChange,
            );
        }

        const authorizationAssignmentChanges =
            assignmentChanges(
                this.dependencies,

                currentAssignments
                    .roleAssignments,

                nextRoleAssignments,

                currentAssignments
                    .permissionAssignments,

                nextPermissionAssignments,
            );

        stateChanges.push(
            ...authorizationAssignmentChanges,
        );

        // ---------------------------------------------------------------------
        // COMMIT ACCESS BUSINESS OUTCOME
        // ---------------------------------------------------------------------

        const changed =
            await commitLifecycle({
                dependencies:
                    this.dependencies,

                aggregateType:
                    "access.tenant-authorization",

                aggregateId:
                    request.tenantId,

                eventType:
                    "access.tenant.authorization.reactivated",

                subject:
                    this.dependencies
                        .outboxSubjects
                        .tenantAuthorizationReactivated,

                now,

                payload: {
                    tenantId:
                        nextTenant.tenantId,

                    status:
                        nextTenant.status,

                    occurredAt:
                        now,

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
            tenantId:
                nextTenant.tenantId,

            status:
                "active",

            changed,

            affectedAssignmentCount:
                authorizationAssignmentChanges.length,
        };
    }
}