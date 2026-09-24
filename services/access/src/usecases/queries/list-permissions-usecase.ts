// services/access/src/usecases/queries/list-permissions-usecase.ts
// -----------------------------------------------------------------------------
// LIST PERMISSIONS USE CASE
// -----------------------------------------------------------------------------
// Returns Access-owned Permission definitions.
//
// Boundary:
//   • resolves canonical Permission state through the Access read model
//   • returns stable provider-neutral Permission results
//   • supports application-layer filtering
//   • preserves immutable Permission Catalog semantics
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import type {
    PermissionClassification,
} from "../../state";

import {
    toPermissionResult,
} from "../shared";

import type {
    AccessUseCaseDependencies,
    PermissionResult,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ListPermissionsRequest {
    /**
     * Optional service boundary.
     */
    readonly service?: string;

    /**
     * Optional resource boundary.
     */
    readonly resource?: string;

    /**
     * Optional Permission classification.
     */
    readonly classification?: PermissionClassification;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ListPermissionsUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ListPermissionsRequest = {},
    ): Promise<readonly PermissionResult[]> {
        const permissions =
            await this.dependencies.readStore
                .listPermissions();

        return permissions
            .filter(
                (permission) =>
                    request.service === undefined
                    || permission.service
                    === request.service,
            )
            .filter(
                (permission) =>
                    request.resource === undefined
                    || permission.resource
                    === request.resource,
            )
            .filter(
                (permission) =>
                    request.classification === undefined
                    || permission.classification
                    === request.classification,
            )
            .map(
                toPermissionResult,
            );
    }
}