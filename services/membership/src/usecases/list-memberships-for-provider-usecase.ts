// services/membership/src/usecases/list-memberships-for-provider-usecase.ts
// -----------------------------------------------------------------------------
// LIST MEMBERSHIPS FOR PROVIDER USE CASE
// -----------------------------------------------------------------------------
// Provider-read query orchestration for Membership Operations™.
//
// Purpose:
//   • support authoritative Membership participation reads by Tenant or Identity
//   • keep Provider Control Plane™ from scanning or reconstructing Memberships
//   • preserve Membership ownership of participation state
//   • keep persistence concerns outside the application boundary
//
// Boundary:
//   • exactly one authoritative filter is required
//   • authorization is enforced by the Membership API before this use case
//   • no state mutation or Folksdo Engine™ commit is performed
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";

import type {
    ListMembershipsForProviderRequest,
    MembershipResult,
} from "../api";

import type {
    MembershipReadStore,
} from "../read-store";

export interface ListMembershipsForProviderUseCase {
    execute(
        request: ListMembershipsForProviderRequest,
        context: RuntimeContext,
    ): Promise<readonly MembershipResult[]>;
}

export function createListMembershipsForProviderUseCase(
    readStore: MembershipReadStore,
): ListMembershipsForProviderUseCase {
    return {
        async execute(
            request,
            _context,
        ): Promise<readonly MembershipResult[]> {
            if (request.tenantId !== undefined) {
                return readStore.listMembershipsByTenant(
                    request.tenantId,
                );
            }

            return readStore.listMembershipsByIdentity(
                request.identityId,
            );
        },
    };
}
