// services/access/src/usecases/queries/get-permission-usecase.ts
// -----------------------------------------------------------------------------
// GET PERMISSION USE CASE
// -----------------------------------------------------------------------------
// Returns a single Access-owned Permission.
//
// Boundary:
//   • resolves canonical Permission state through the Access read model
//   • returns a stable provider-neutral Permission result
//   • prevents canonical persistence state from leaking
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import {
    PermissionNotFoundError,
} from "../../errors";

import {
    toPermissionResult,
} from "../shared";

import type {
    PermissionResult,
} from "../shared";

import type {
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface GetPermissionRequest {
    readonly permissionId: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class GetPermissionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: GetPermissionRequest,
    ): Promise<PermissionResult> {
        const permission =
            await this.dependencies.readStore
                .findPermissionById(
                    request.permissionId,
                );

        if (permission === null) {
            throw new PermissionNotFoundError(
                request.permissionId,
            );
        }

        return toPermissionResult(
            permission,
        );
    }
}