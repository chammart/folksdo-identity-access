// services/access/src/usecases/authorization-lifecycle/activate-tenant-authorization-usecase.ts
// -----------------------------------------------------------------------------
// ACTIVATE TENANT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Records an activated Tenant as eligible for Access authorization evaluation.
//
// Boundary:
//   • records the active Tenant as an Access Known Fact
//   • establishes Tenant lifecycle eligibility for authorization
//   • does not activate or create the Tenant
//   • commits the Access lifecycle outcome atomically
// -----------------------------------------------------------------------------

import {
    activateKnownTenant,
} from "../../business-rules";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared";

import {
    commitLifecycle,
    knownFactChange,
} from "./lifecycle-support";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ActivateTenantAuthorizationUseCaseRequest {
    readonly tenantId: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ActivateTenantAuthorizationUseCaseResult {
    readonly tenantId: string;
    readonly status: "active";
    readonly changed: boolean;
    readonly affectedAssignmentCount: number;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ActivateTenantAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ActivateTenantAuthorizationUseCaseRequest,
    ): Promise<ActivateTenantAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        const currentTenant =
            await this.dependencies.readStore.findKnownTenant(
                request.tenantId,
            );

        const nextTenant = activateKnownTenant(
            currentTenant,
            request.tenantId,
            now,
        );

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

        const changed = await commitLifecycle({
            dependencies: this.dependencies,
            aggregateType: "access.tenant-authorization",
            aggregateId: request.tenantId,
            eventType: "access.tenant.authorization.activated",
            subject:
                this.dependencies.outboxSubjects
                    .tenantAuthorizationActivated,
            now,
            payload: {
                tenantId: nextTenant.tenantId,
                status: nextTenant.status,
                occurredAt: now,
                sourceReference: request.sourceReference,
                affectedAssignmentCount: 0,
            },
            stateChanges,
        });

        return {
            tenantId: nextTenant.tenantId,
            status: "active",
            changed,
            affectedAssignmentCount: 0,
        };
    }
}
