// services/access/src/usecases/roles/archive-role-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE ROLE USE CASE
// -----------------------------------------------------------------------------
// Archives an existing Access-owned Role.
//
// Boundary:
//   • resolves canonical Role state
//   • delegates lifecycle validation to Access business rules
//   • records the Role lifecycle transition atomically
//   • does not directly remove Role assignments
// -----------------------------------------------------------------------------

import {
    archiveRole,
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

export interface ArchiveRoleRequest {
    readonly roleId: string;

    readonly archivedBy: string;

    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ArchiveRoleUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: ArchiveRoleRequest,
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

        const archivedRole =
            archiveRole({
                role:
                    existingRole,

                archivedBy:
                    request.archivedBy,

                now,
            });

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.role",

                aggregateId:
                    archivedRole.roleId,

                stateChanges: [
                    {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.roles,

                        documentId:
                            archivedRole.roleId,

                        patch: {
                            ...archivedRole,
                        },
                    },
                ],

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.role.archived",

                        aggregateType:
                            "access.role",

                        aggregateId:
                            archivedRole.roleId,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                archivedRole.roleId,

                            roleType:
                                archivedRole.roleType,

                            tenantId:
                                archivedRole.tenantId,

                            archivedBy:
                                request.archivedBy,

                            archivedAt:
                                archivedRole.archivedAt,

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
                            this.dependencies.outboxSubjects.roleArchived,

                        occurredAt:
                            now,

                        payload: {
                            roleId:
                                archivedRole.roleId,

                            roleType:
                                archivedRole.roleType,

                            tenantId:
                                archivedRole.tenantId,

                            lifecycleStatus:
                                archivedRole.lifecycleStatus,

                            archivedAt:
                                archivedRole.archivedAt,

                            archivedBy:
                                archivedRole.archivedBy,

                            reason:
                                request.reason,
                        },
                    },
                ],
            },
        );

        return toRoleResult(
            archivedRole,
        );
    }
}