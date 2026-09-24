// services/access/src/usecases/authorization-lifecycle/provision-tenant-authorization-usecase.ts
// -----------------------------------------------------------------------------
// PROVISION TENANT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Records a newly created Tenant as an Access-owned known lifecycle fact.
//
// Boundary:
//   • records Tenant provisioning as an Access Known Fact
//   • does not activate Tenant-scoped authorization
//   • commits the Access lifecycle outcome atomically
//   • emits the completed Tenant authorization provisioning event
//
// This use case does not own:
//   • Tenant creation
//   • Tenant lifecycle
//   • Membership lifecycle
//   • Identity lifecycle
// -----------------------------------------------------------------------------

import {
    provisionKnownTenant,
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

export interface ProvisionTenantAuthorizationUseCaseRequest {
    readonly tenantId: string;
    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ProvisionTenantAuthorizationUseCaseResult {
    readonly tenantId: string;
    readonly status: "provisioning";
    readonly changed: boolean;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ProvisionTenantAuthorizationUseCase {
    public constructor(
        private readonly dependencies: AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ProvisionTenantAuthorizationUseCaseRequest,
    ): Promise<ProvisionTenantAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();

        const currentTenant =
            await this.dependencies.readStore.findKnownTenant(
                request.tenantId,
            );

        const nextTenant = provisionKnownTenant(
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
            eventType: "access.tenant.authorization.provisioned",
            subject:
                this.dependencies.outboxSubjects
                    .tenantAuthorizationProvisioned,
            now,
            payload: {
                tenantId: nextTenant.tenantId,
                status: nextTenant.status,
                occurredAt: now,
                sourceReference: request.sourceReference,
            },
            stateChanges,
        });

        return {
            tenantId: nextTenant.tenantId,
            status: "provisioning",
            changed,
        };
    }
}
