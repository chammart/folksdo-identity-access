// services/access/src/usecases/queries/get-policy-usecase.ts
// -----------------------------------------------------------------------------
// GET POLICY USE CASE
// -----------------------------------------------------------------------------
// Returns a single Access-owned Authorization Policy.
//
// Boundary:
//   • resolves canonical Policy state through the Access read model
//   • returns a stable provider-neutral Policy result
//   • prevents canonical persistence state from leaking
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import {
    AuthorizationPolicyNotFoundError,
} from "../../errors";

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

export interface GetPolicyRequest {
    readonly policyId: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class GetPolicyUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: GetPolicyRequest,
    ): Promise<AccessPolicyResult> {
        const policy =
            await this.dependencies.readStore
                .findPolicyById(
                    request.policyId,
                );

        if (policy === null) {
            throw new AuthorizationPolicyNotFoundError(
                request.policyId,
            );
        }

        return toAccessPolicyResult(
            policy,
        );
    }
}