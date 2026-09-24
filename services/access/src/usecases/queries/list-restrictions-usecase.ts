// services/access/src/usecases/queries/list-restrictions-usecase.ts
// -----------------------------------------------------------------------------
// LIST RESTRICTIONS USE CASE
// -----------------------------------------------------------------------------
// Returns Access-owned Restrictions.
//
// Boundary:
//   • resolves canonical Restriction state through the Access read model
//   • optionally scopes results to a Tenant
//   • returns stable provider-neutral Restriction results
//   • supports application-layer filtering
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import type {
    AccessRestrictionState,
} from "../../state";

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

export interface ListRestrictionsRequest {
    /**
     * Optional Tenant scope.
     */
    readonly tenantId?: string;

    /**
     * Optional Restriction status filter.
     */
    readonly status?:
    AccessRestrictionState["status"];
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ListRestrictionsUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ListRestrictionsRequest = {},
    ): Promise<readonly AccessRestrictionResult[]> {
        const restrictions =
            await this.dependencies.readStore
                .listRestrictions(
                    request.tenantId,
                );

        return restrictions
            .filter(
                (restriction) =>
                    request.status === undefined
                    || restriction.status
                    === request.status,
            )
            .map(
                toAccessRestrictionResult,
            );
    }
}