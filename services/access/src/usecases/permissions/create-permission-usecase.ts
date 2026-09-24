// services/access/src/usecases/permissions/create-permission-usecase.ts
// -----------------------------------------------------------------------------
// CREATE PERMISSION USE CASE
// -----------------------------------------------------------------------------
// Registers a protected business action in the Access Permission Catalog.
//
// Boundary:
//   • derives the canonical Permission identifier
//   • prevents duplicate Permission registration
//   • delegates canonical state creation to Access business rules
//   • commits state, event and outbox message atomically
//   • does not assign the Permission to Roles or Memberships
// -----------------------------------------------------------------------------

import {
    createPermission,
} from "../../business-rules";

import {
    PermissionAlreadyExistsError,
} from "../../errors";

import type {
    PermissionClassification,
} from "../../state";

import {
    commitAccess,
} from "../shared/access-commit";

import {
    toPermissionResult,
} from "../shared/access-results";

import type {
    PermissionResult,
} from "../shared/access-results";

import type {
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface CreatePermissionRequest {
    readonly service: string;

    readonly resource: string;

    readonly action: string;

    readonly displayName: string;

    readonly description: string;

    readonly classification: PermissionClassification;

    readonly createdBy: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class CreatePermissionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: CreatePermissionRequest,
    ): Promise<PermissionResult> {
        const permissionId = [
            request.service,
            request.resource,
            request.action,
        ].join(".");

        const existingPermission =
            await this.dependencies.readStore.findPermissionById(
                permissionId,
            );

        if (existingPermission !== null) {
            throw new PermissionAlreadyExistsError(
                permissionId,
            );
        }

        const now =
            this.dependencies.clock.now();

        const permission =
            createPermission({
                permissionId,

                service:
                    request.service,

                resource:
                    request.resource,

                action:
                    request.action,

                displayName:
                    request.displayName,

                description:
                    request.description,

                classification:
                    request.classification,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.permission",

                aggregateId:
                    permission.permissionId,

                stateChanges: [
                    {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections.permissions,

                        document: {
                            ...permission,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.permission.created",

                        aggregateType:
                            "access.permission",

                        aggregateId:
                            permission.permissionId,

                        occurredAt:
                            now,

                        payload: {
                            permissionId:
                                permission.permissionId,

                            service:
                                permission.service,

                            resource:
                                permission.resource,

                            action:
                                permission.action,

                            displayName:
                                permission.displayName,

                            classification:
                                permission.classification,

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
                            this.dependencies.outboxSubjects.permissionCreated,

                        occurredAt:
                            now,

                        payload: {
                            permissionId:
                                permission.permissionId,

                            service:
                                permission.service,

                            resource:
                                permission.resource,

                            action:
                                permission.action,

                            displayName:
                                permission.displayName,

                            classification:
                                permission.classification,
                        },
                    },
                ],
            },
        );

        return toPermissionResult(
            permission,
        );
    }
}