// services/access/src/usecases/roles/create-role-usecase.ts
// -----------------------------------------------------------------------------
// CREATE ROLE USE CASE
// -----------------------------------------------------------------------------
// Creates a new Access-owned Role.
//
// Boundary:
//   • validates Role uniqueness through the Access read model
//   • delegates canonical Role creation to Access business rules
//   • commits Role state, replayable event and outbox message atomically
//   • contains no HTTP or persistence-provider concerns
// -----------------------------------------------------------------------------

import {
    createRole,
} from "../../business-rules";

import {
    PermissionNotFoundError,
    RoleAlreadyExistsError,
} from "../../errors";

import type {
    RoleType,
} from "../../state";

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

export interface CreateRoleRequest {
    readonly key: string;

    readonly roleType: RoleType;

    readonly tenantId?: string;

    readonly name: string;

    readonly description: string;

    readonly permissionIds?: readonly string[];

    readonly createdBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class CreateRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: CreateRoleRequest,
    ): Promise<RoleResult> {
        const existingRole =
            await this.dependencies.readStore.findRoleByName(
                request.name,
                request.tenantId,
            );

        if (existingRole !== null) {
            throw new RoleAlreadyExistsError();
        }

        const permissionIds: readonly string[] = [
            ...new Set(
                request.permissionIds
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

        const role =
            createRole({
                roleId:
                    this.dependencies.ids.roleId(),

                key:
                    request.key,

                roleType:
                    request.roleType,

                tenantId:
                    request.tenantId,

                name:
                    request.name,

                description:
                    request.description,

                permissionIds,

                createdBy:
                    request.createdBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role",

                aggregateId:
                    role.roleId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections.roles,

                        document: {
                            ...role,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role.created",

                        aggregateType:
                            "access.role",

                        aggregateId:
                            role.roleId,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                role.roleId,

                            key:
                                role.key,

                            roleType:
                                role.roleType,

                            tenantId:
                                role.tenantId,

                            name:
                                role.name,

                            permissionIds:
                                role.permissionIds,

                            createdBy:
                                request.createdBy,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.roleCreated,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                role.roleId,

                            key:
                                role.key,

                            roleType:
                                role.roleType,

                            tenantId:
                                role.tenantId,

                            name:
                                role.name,

                            permissionIds:
                                role.permissionIds,

                            lifecycleStatus:
                                role.lifecycleStatus,
                        },
                    },
                ],
            },
        );

        return toRoleResult(role);
    }
}