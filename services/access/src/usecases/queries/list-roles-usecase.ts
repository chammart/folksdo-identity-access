// services/access/src/usecases/queries/list-roles-usecase.ts
// -----------------------------------------------------------------------------
// LIST ROLES USE CASE
// -----------------------------------------------------------------------------
// Returns Access-owned Role definitions.
//
// Boundary:
//   • resolves canonical Role state through the Access read model
//   • optionally limits Tenant-owned Roles to a Tenant context
//   • returns stable provider-neutral Role results
//   • supports application-layer filtering
//   • performs no mutation or authorization evaluation
// -----------------------------------------------------------------------------
//
// Query semantics:
//   • without tenantId, returns globally queryable Roles according to the
//     read-store implementation
//   • with tenantId, returns Roles applicable to that Tenant query boundary
//   • lifecycle filtering remains an explicit caller concern
// -----------------------------------------------------------------------------

import type {
    RoleLifecycleStatus,
    RoleType,
} from "../../state";

import {
    toRoleResult,
} from "../shared";

import type {
    AccessUseCaseDependencies,
    RoleResult,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ListRolesRequest {
    /**
     * Optional Tenant ownership boundary.
     *
     * The read store determines whether globally defined System or Platform
     * Roles are included with Tenant-owned Roles.
     */
    readonly tenantId?: string;

    /**
     * Optional Role family filter.
     */
    readonly roleType?: RoleType;

    /**
     * Optional Role lifecycle filter.
     */
    readonly lifecycleStatus?: RoleLifecycleStatus;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ListRolesUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ListRolesRequest = {},
    ): Promise<readonly RoleResult[]> {
        const roles =
            await this.dependencies.readStore
                .listRoles(
                    request.tenantId,
                );

        return roles
            .filter(
                (role) =>
                    request.roleType === undefined
                    || role.roleType
                    === request.roleType,
            )
            .filter(
                (role) =>
                    request.lifecycleStatus === undefined
                    || role.lifecycleStatus
                    === request.lifecycleStatus,
            )
            .map(
                toRoleResult,
            );
    }
}