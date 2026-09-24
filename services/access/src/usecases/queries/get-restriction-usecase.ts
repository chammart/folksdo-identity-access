// services/access/src/usecases/queries/get-restriction-usecase.ts
// -----------------------------------------------------------------------------
// GET RESTRICTION USE CASE
// -----------------------------------------------------------------------------
// Returns a single Access-owned Restriction.
//
// Boundary:
//   • resolves canonical Restriction state through the Access read model
//   • returns a stable provider-neutral Restriction result
//   • prevents canonical persistence state from leaking
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import {
    RestrictionNotFoundError,
} from "../../errors";

import {
    toAccessRestrictionResult,
} from "../shared";

import type {
    AccessRestrictionResult,
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface GetRestrictionRequest {
    readonly restrictionId: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class GetRestrictionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: GetRestrictionRequest,
    ): Promise<AccessRestrictionResult> {
        const restriction =
            await this.dependencies.readStore
                .findRestrictionById(
                    request.restrictionId,
                );

        if (restriction === null) {
            throw new RestrictionNotFoundError(
                request.restrictionId,
            );
        }

        return toAccessRestrictionResult(
            restriction,
        );
    }
}