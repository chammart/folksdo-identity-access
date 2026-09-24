// services/access/src/usecases/update-role-usecase.ts
// -----------------------------------------------------------------------------
// UPDATE ROLE USE CASE
// -----------------------------------------------------------------------------
// Updates an existing Access-owned Role.
//
// Boundary:
//   • resolves canonical Role state through the Access read model
//   • delegates Role mutation validation to Access business rules
//   • commits state, event and outbox message atomically
//   • does not mutate assignments or effective Permission projections
// -----------------------------------------------------------------------------

import {
    updateRole,
} from "../../business-rules";

import {
    PermissionNotFoundError,
    RoleAlreadyExistsError,
    RoleNotFoundError,
} from "../../errors";

import {
    commitAccess,
} from "../shared/access-commit";

import {
    toRoleResult,
} from "../shared/access-results";

import type {
    RoleResult,
} from "../shared/access-results";

import type {
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface UpdateRoleRequest {
    readonly roleId: string;

    readonly name?: string;

    readonly description?: string;

    readonly permissionIds?: readonly string[];

    readonly updatedBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class UpdateRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: UpdateRoleRequest,
    ): Promise<RoleResult> {
        const existingRole =
            await this.dependencies.readStore.findRoleById(
                request.roleId,
            );

        if (existingRole === null) {
            throw new RoleNotFoundError();
        }

        const updatedName =
            request.name ??
            existingRole.name;

        const updatedDescription =
            request.description ??
            existingRole.description;

        if (updatedName !== existingRole.name) {
            const roleWithRequestedName =
                await this.dependencies.readStore.findRoleByName(
                    updatedName,
                    existingRole.tenantId,
                );

            if (
                roleWithRequestedName !== null &&
                roleWithRequestedName.roleId !==
                existingRole.roleId
            ) {
                throw new RoleAlreadyExistsError();
            }
        }

        const permissionIds: readonly string[] = [
            ...new Set(
                request.permissionIds
                ?? existingRole.permissionIds
                ?? [],
            ),
        ];

        const permissions =
            await this.dependencies.readStore.findPermissionsByIds(
                permissionIds,
            );

        const resolvedPermissionIds =
            new Set(
                permissions.map(
                    permission =>
                        permission.permissionId,
                ),
            );

        const missingPermissionId =
            permissionIds.find(
                permissionId =>
                    !resolvedPermissionIds.has(
                        permissionId,
                    ),
            );

        if (missingPermissionId !== undefined) {
            throw new PermissionNotFoundError(
                missingPermissionId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const updatedRole =
            updateRole({
                role:
                    existingRole,

                name:
                    updatedName,

                description:
                    updatedDescription,

                permissionIds,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role",

                aggregateId:
                    updatedRole.roleId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.roles,

                        documentId:
                            updatedRole.roleId,

                        patch: {
                            ...updatedRole,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role.updated",

                        aggregateType:
                            "access.role",

                        aggregateId:
                            updatedRole.roleId,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                updatedRole.roleId,

                            roleType:
                                updatedRole.roleType,

                            tenantId:
                                updatedRole.tenantId,

                            name:
                                updatedRole.name,

                            description:
                                updatedRole.description,

                            permissionIds:
                                updatedRole.permissionIds,

                            updatedBy:
                                request.updatedBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.roleUpdated,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                updatedRole.roleId,

                            roleType:
                                updatedRole.roleType,

                            tenantId:
                                updatedRole.tenantId,

                            name:
                                updatedRole.name,

                            description:
                                updatedRole.description,

                            permissionIds:
                                updatedRole.permissionIds,

                            lifecycleStatus:
                                updatedRole.lifecycleStatus,

                            updatedBy:
                                request.updatedBy,
                        },
                    },
                ],
            },
        );

        return toRoleResult(
            updatedRole,
        );
    }
}