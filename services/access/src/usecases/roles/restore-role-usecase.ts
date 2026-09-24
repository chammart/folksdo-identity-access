// services/access/src/usecases/roles/restore-role-usecase.ts
// -----------------------------------------------------------------------------
// RESTORE ROLE USE CASE
// -----------------------------------------------------------------------------
// Restores an archived Access-owned Role.
//
// Boundary:
//   • resolves canonical Role state
//   • delegates lifecycle validation to Access business rules
//   • commits the Role restoration atomically
//   • preserves historical archival metadata
//   • does not automatically restore removed or archived assignments
// -----------------------------------------------------------------------------

import {
    restoreRole,
} from "../../business-rules";

import {
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

export interface RestoreRoleRequest {
    readonly roleId: string;

    readonly restoredBy: string;

    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class RestoreRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: RestoreRoleRequest,
    ): Promise<RoleResult> {
        const existingRole =
            await this.dependencies.readStore.findRoleById(
                request.roleId,
            );

        if (existingRole === null) {
            throw new RoleNotFoundError();
        }

        const now =
            this.dependencies.clock.now();

        const restoredRole =
            restoreRole({
                role:
                    existingRole,

                restoredBy:
                    request.restoredBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role",

                aggregateId:
                    restoredRole.roleId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.roles,

                        documentId:
                            restoredRole.roleId,

                        patch: {
                            ...restoredRole,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role.restored",

                        aggregateType:
                            "access.role",

                        aggregateId:
                            restoredRole.roleId,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                restoredRole.roleId,

                            roleType:
                                restoredRole.roleType,

                            tenantId:
                                restoredRole.tenantId,

                            restoredAt:
                                restoredRole.restoredAt,

                            restoredBy:
                                restoredRole.restoredBy,

                            reason:
                                request.reason,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.roleRestored,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                restoredRole.roleId,

                            roleType:
                                restoredRole.roleType,

                            tenantId:
                                restoredRole.tenantId,

                            lifecycleStatus:
                                restoredRole.lifecycleStatus,

                            restoredAt:
                                restoredRole.restoredAt,

                            restoredBy:
                                restoredRole.restoredBy,

                            reason:
                                request.reason,
                        },
                    },
                ],
            },
        );

        return toRoleResult(
            restoredRole,
        );
    }
}