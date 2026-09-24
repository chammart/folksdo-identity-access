// services/membership/src/usecases/list-tenant-memberships-usecase.ts
// -----------------------------------------------------------------------------
// LIST TENANT MEMBERSHIPS USE CASE
// -----------------------------------------------------------------------------
// Query orchestration for List Tenant Memberships™.
//
// Purpose:
//   • resolve all Memberships associated with a Tenant
//   • return canonical Membership-owned participation state
//   • keep persistence concerns outside the use-case boundary
//   • keep authorization decisions outside Membership Operations™
//
// Boundary:
//   • this is a read-only use case
//   • RuntimeContext is accepted for API consistency and observability
//   • no state mutation or Folksdo Engine™ commit is performed
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipResult,
} from "../api";

import type {
    MembershipReadStore,
} from "../read-store";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface ListTenantMembershipsUseCase {
    execute(
        tenantId: string,
        context: RuntimeContext,
    ): Promise<readonly MembershipResult[]>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createListTenantMembershipsUseCase(
    readStore: MembershipReadStore,
): ListTenantMembershipsUseCase {
    return {
        async execute(
            tenantId: string,
            _context: RuntimeContext,
        ): Promise<readonly MembershipResult[]> {
            const memberships =
                await readStore.listMembershipsByTenant(
                    tenantId,
                );

            return memberships;
        },
    };
}