// services/access/src/usecases/queries/list-policies-usecase.ts
// -----------------------------------------------------------------------------
// LIST POLICIES USE CASE
// -----------------------------------------------------------------------------
// Returns Access-owned Authorization Policies.
//
// Boundary:
//   • resolves canonical Policy state through the Access read model
//   • returns stable provider-neutral Policy results
//   • supports application-layer filtering
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import type {
    AuthorizationPolicyState,
} from "../../state";

import {
    toAccessPolicyResult,
} from "../shared";

import type {
    AccessPolicyResult,
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ListPoliciesRequest {
    /**
     * Optional Policy lifecycle filter.
     */
    readonly lifecycleStatus?:
    AuthorizationPolicyState["lifecycleStatus"];
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ListPoliciesUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ListPoliciesRequest = {},
    ): Promise<readonly AccessPolicyResult[]> {
        const policies =
            await this.dependencies.readStore
                .listPolicies();

        return policies
            .filter(
                (policy) =>
                    request.lifecycleStatus === undefined
                    || policy.lifecycleStatus
                    === request.lifecycleStatus,
            )
            .map(
                toAccessPolicyResult,
            );
    }
}