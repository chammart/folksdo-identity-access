// services/membership/src/usecases/list-memberships-for-provider-usecase.ts
// -----------------------------------------------------------------------------
// LIST MEMBERSHIPS FOR PROVIDER USE CASE
// -----------------------------------------------------------------------------
// Provider-read query orchestration for Membership Operations™.
//
// Purpose:
//   • support administration-oriented Membership discovery
//   • filter by Tenant, Identity, lifecycle state, type, and lifecycle dates
//   • provide deterministic bounded pagination
//   • preserve Membership ownership of participation state
//   • keep persistence concerns outside the application boundary
//
// Boundary:
//   • authorization is enforced by the Membership API before this use case
//   • filters may be combined and are optional for authorized Provider reads
//   • no state mutation or Folksdo Engine™ commit is performed
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";

import type {
    ListMembershipsForProviderRequest,
} from "../api";

import type {
    ListMembershipsResult,
    MembershipReadStore,
} from "../read-store";

export interface ListMembershipsForProviderUseCase {
    execute(
        request: ListMembershipsForProviderRequest,
        context: RuntimeContext,
    ): Promise<ListMembershipsResult>;
}

export function createListMembershipsForProviderUseCase(
    readStore: MembershipReadStore,
): ListMembershipsForProviderUseCase {
    return {
        async execute(
            request,
            _context,
        ): Promise<ListMembershipsResult> {
            return readStore.listMemberships(
                request,
            );
        },
    };
}
