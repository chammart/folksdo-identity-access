// services/access/src/usecases/get-role-usecase.ts
// -----------------------------------------------------------------------------
// GET ROLE USE CASE
// -----------------------------------------------------------------------------
// Returns a single Access-owned Role.
//
// Boundary:
//   • resolves canonical Role state through the Access read model
//   • returns a stable provider-neutral Role result
//   • prevents canonical persistence state from leaking
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------

import {
    RoleNotFoundError,
} from "../../errors";

import {
    toRoleResult,
    RoleResult,
} from "../shared";


import type {
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface GetRoleRequest {
    readonly roleId: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class GetRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: GetRoleRequest,
    ): Promise<RoleResult> {
        const role =
            await this.dependencies.readStore.findRoleById(
                request.roleId,
            );

        if (role === null) {
            throw new RoleNotFoundError(
                request.roleId,
            );
        }

        return toRoleResult(
            role,
        );
    }
}