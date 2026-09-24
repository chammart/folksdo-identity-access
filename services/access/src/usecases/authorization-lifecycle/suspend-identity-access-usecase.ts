// services/access/src/usecases/authorization-lifecycle/suspend-identity-access-usecase.ts
// -----------------------------------------------------------------------------
// SUSPEND IDENTITY ACCESS USE CASE
// -----------------------------------------------------------------------------
// Suspends Access-owned authorization associated with an Identity.
//
// Boundary:
//   • resolves the Identity and Membership facts known by Access
//   • delegates lifecycle transitions to pure Access business rules
//   • preserves assignment history and overlapping suspension causes
//   • records all Access-owned state changes atomically
//   • remains independent from Identity Operations™ transport contracts
// -----------------------------------------------------------------------------

import {
    suspendKnownIdentityAccess,
    suspendPermissionAssignmentForIdentity,
    suspendRoleAssignmentForIdentity,
} from "../../business-rules";

import type {
    KnownIdentity,
} from "../../known-facts";

import type {
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../../state";

import {
    commitAccess,
} from "../shared/access-commit";

import type {
    IdentityAccessSuspensionResult,
} from "../shared/access-results";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface SuspendIdentityAccessRequest {
    readonly identityId: string;

    readonly reason?: string;

    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// CHANGE DETECTION
// -----------------------------------------------------------------------------

function hasKnownIdentityChanged(
    current: KnownIdentity | null,
    next: KnownIdentity,
): boolean {
    return (
        current === null
        || current.status !== next.status
        || current.disabledAt !== next.disabledAt
        || current.updatedAt !== next.updatedAt
    );
}

function hasRoleAssignmentChanged(
    current: RoleAssignmentState,
    next: RoleAssignmentState,
): boolean {
    return (
        current.status !== next.status
        || current.updatedAt !== next.updatedAt
        || current.suspendedAt !== next.suspendedAt
        || current.suspensionSources.length
            !== next.suspensionSources.length
    );
}

function hasPermissionAssignmentChanged(
    current: PermissionAssignmentState,
    next: PermissionAssignmentState,
): boolean {
    return (
        current.status !== next.status
        || current.updatedAt !== next.updatedAt
        || current.suspendedAt !== next.suspendedAt
        || current.suspensionSources.length
            !== next.suspensionSources.length
    );
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class SuspendIdentityAccessUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: SuspendIdentityAccessRequest,
    ): Promise<IdentityAccessSuspensionResult> {
        const now =
            this.dependencies.clock.now();

        const existingIdentity =
            await this.dependencies.readStore.findKnownIdentity(
                request.identityId,
            );

        const suspendedIdentity =
            suspendKnownIdentityAccess({
                identity:
                    existingIdentity,

                identityId:
                    request.identityId,

                now,
            });

        const memberships =
            await this.dependencies.readStore.listKnownMemberships(
                request.identityId,
            );

        const roleAssignments:
        RoleAssignmentState[] = [];

        const permissionAssignments:
        PermissionAssignmentState[] = [];

        for (const membership of memberships) {
            roleAssignments.push(
                ...await this.dependencies.readStore.listRoleAssignments(
                    membership.membershipId,
                ),
            );

            permissionAssignments.push(
                ...await this.dependencies.readStore.listPermissionAssignments(
                    membership.membershipId,
                ),
            );
        }

        const suspendedRoleAssignments =
            roleAssignments.map(
                (assignment) =>
                    suspendRoleAssignmentForIdentity({
                        assignment,
                        now,
                    }),
            );

        const suspendedPermissionAssignments =
            permissionAssignments.map(
                (assignment) =>
                    suspendPermissionAssignmentForIdentity({
                        assignment,
                        now,
                    }),
            );

        const stateChanges:
        AccessStateChange[] = [];

        if (
            hasKnownIdentityChanged(
                existingIdentity,
                suspendedIdentity,
            )
        ) {
            stateChanges.push(
                existingIdentity === null
                    ? {
                        operation:
                            "insert",

                        collection:
                            this.dependencies.collections.knownIdentities,

                        document: {
                            ...suspendedIdentity,
                        },
                    }
                    : {
                        operation:
                            "update",

                        collection:
                            this.dependencies.collections.knownIdentities,

                        documentId:
                            suspendedIdentity.identityId,

                        patch: {
                            ...suspendedIdentity,
                        },
                    },
            );
        }

        for (
            let index = 0;
            index < roleAssignments.length;
            index += 1
        ) {
            const current =
                roleAssignments[index];

            const next =
                suspendedRoleAssignments[index];

            if (
                current !== undefined
                && next !== undefined
                && hasRoleAssignmentChanged(
                    current,
                    next,
                )
            ) {
                stateChanges.push({
                    operation:
                        "update",

                    collection:
                        this.dependencies.collections.roleAssignments,

                    documentId:
                        next.assignmentId,

                    patch: {
                        ...next,
                    },
                });
            }
        }

        for (
            let index = 0;
            index < permissionAssignments.length;
            index += 1
        ) {
            const current =
                permissionAssignments[index];

            const next =
                suspendedPermissionAssignments[index];

            if (
                current !== undefined
                && next !== undefined
                && hasPermissionAssignmentChanged(
                    current,
                    next,
                )
            ) {
                stateChanges.push({
                    operation:
                        "update",

                    collection:
                        this.dependencies.collections.permissionAssignments,

                    documentId:
                        next.assignmentId,

                    patch: {
                        ...next,
                    },
                });
            }
        }

        if (stateChanges.length === 0) {
            return {
                identityId:
                    request.identityId,

                status:
                    "disabled",

                suspendedAt:
                    suspendedIdentity.disabledAt ?? now,

                changed:
                    false,

                suspendedRoleAssignmentCount:
                    0,

                suspendedPermissionAssignmentCount:
                    0,
            };
        }

        const suspendedRoleAssignmentCount =
            suspendedRoleAssignments.filter(
                (assignment, index) => {
                    const current =
                        roleAssignments[index];

                    return (
                        current !== undefined
                        && hasRoleAssignmentChanged(
                            current,
                            assignment,
                        )
                    );
                },
            ).length;

        const suspendedPermissionAssignmentCount =
            suspendedPermissionAssignments.filter(
                (assignment, index) => {
                    const current =
                        permissionAssignments[index];

                    return (
                        current !== undefined
                        && hasPermissionAssignmentChanged(
                            current,
                            assignment,
                        )
                    );
                },
            ).length;

        await commitAccess(
            this.dependencies.engine,
            {
                aggregateType:
                    "access.identity-authorization",

                aggregateId:
                    request.identityId,

                stateChanges,

                events: [
                    {
                        eventId:
                            this.dependencies.ids.eventId(),

                        eventType:
                            "access.identity_access.suspended",

                        aggregateType:
                            "access.identity-authorization",

                        aggregateId:
                            request.identityId,

                        occurredAt:
                            now,

                        payload: {
                            identityId:
                                request.identityId,

                            suspendedAt:
                                suspendedIdentity.disabledAt ?? now,

                            reason:
                                request.reason,

                            sourceReference:
                                request.sourceReference,

                            suspendedRoleAssignmentCount,

                            suspendedPermissionAssignmentCount,
                        },
                    },
                ],

                outbox: [
                    {
                        messageId:
                            this.dependencies.ids.outboxMessageId(),

                        subject:
                            this.dependencies.outboxSubjects.identityAccessSuspended,

                        occurredAt:
                            now,

                        payload: {
                            identityId:
                                request.identityId,

                            status:
                                "disabled",

                            suspendedAt:
                                suspendedIdentity.disabledAt ?? now,

                            reason:
                                request.reason,

                            sourceReference:
                                request.sourceReference,

                            suspendedRoleAssignmentCount,

                            suspendedPermissionAssignmentCount,
                        },
                    },
                ],
            },
        );

        return {
            identityId:
                request.identityId,

            status:
                "disabled",

            suspendedAt:
                suspendedIdentity.disabledAt ?? now,

            changed:
                true,

            suspendedRoleAssignmentCount,

            suspendedPermissionAssignmentCount,
        };
    }
}
