// services/access/src/usecases/authorization-lifecycle/lifecycle-support.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION LIFECYCLE SUPPORT
// -----------------------------------------------------------------------------
// Internal application helpers shared by Access authorization lifecycle use
// cases.
//
// Boundary:
//   • detects state changes
//   • builds Access state-change operations
//   • loads assignment groups needed by lifecycle use cases
//   • commits lifecycle outcomes through the canonical Access commit boundary
//
// This module does not:
//   • own business rules
//   • define authorization policy
//   • evaluate permissions
//   • expose a general-purpose lifecycle framework
// -----------------------------------------------------------------------------

import type {
    KnownIdentity,
    KnownMembership,
    KnownSubscriptionCapabilities,
    KnownTenant,
} from "../../known-facts";

import type {
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../../state";

import {
    commitAccess,
} from "../shared/access-commit";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared/access-usecase-contracts";

// -----------------------------------------------------------------------------
// INTERNAL TYPES
// -----------------------------------------------------------------------------

export interface LoadedAssignmentState {
    readonly roles: readonly RoleAssignmentState[];
    readonly permissions: readonly PermissionAssignmentState[];
}

// -----------------------------------------------------------------------------
// STATE COMPARISON
// -----------------------------------------------------------------------------

export function stateChanged(
    current:
        | KnownIdentity
        | KnownMembership
        | KnownTenant
        | KnownSubscriptionCapabilities
        | RoleAssignmentState
        | PermissionAssignmentState
        | null,
    next:
        | KnownIdentity
        | KnownMembership
        | KnownTenant
        | KnownSubscriptionCapabilities
        | RoleAssignmentState
        | PermissionAssignmentState,
): boolean {
    return (
        current === null ||
        JSON.stringify(current) !== JSON.stringify(next)
    );
}

// -----------------------------------------------------------------------------
// KNOWN FACT STATE CHANGE
// -----------------------------------------------------------------------------

export function knownFactChange(
    collection: string,
    id: string,
    current:
        | KnownIdentity
        | KnownMembership
        | KnownTenant
        | KnownSubscriptionCapabilities
        | null,
    next:
        | KnownIdentity
        | KnownMembership
        | KnownTenant
        | KnownSubscriptionCapabilities,
): AccessStateChange | null {
    if (!stateChanged(current, next)) {
        return null;
    }

    if (current === null) {
        return {
            operation: "insert",
            collection,
            document: {
                ...next,
            },
        };
    }

    return {
        operation: "update",
        collection,
        documentId: id,
        patch: {
            ...next,
        },
    };
}

// -----------------------------------------------------------------------------
// ASSIGNMENT STATE CHANGES
// -----------------------------------------------------------------------------

export function assignmentChanges(
    dependencies: AccessUseCaseDependencies,
    currentRoles: readonly RoleAssignmentState[],
    nextRoles: readonly RoleAssignmentState[],
    currentPermissions: readonly PermissionAssignmentState[],
    nextPermissions: readonly PermissionAssignmentState[],
): AccessStateChange[] {
    const changes: AccessStateChange[] = [];

    const currentRolesById = new Map(
        currentRoles.map(
            (assignment) => [
                assignment.assignmentId,
                assignment,
            ],
        ),
    );

    for (const nextAssignment of nextRoles) {
        const currentAssignment =
            currentRolesById.get(
                nextAssignment.assignmentId,
            );

        if (
            currentAssignment &&
            stateChanged(
                currentAssignment,
                nextAssignment,
            )
        ) {
            changes.push({
                operation: "update",
                collection:
                    dependencies.collections
                        .roleAssignments,
                documentId:
                    nextAssignment.assignmentId,
                patch: {
                    ...nextAssignment,
                },
            });
        }
    }

    const currentPermissionsById = new Map(
        currentPermissions.map(
            (assignment) => [
                assignment.assignmentId,
                assignment,
            ],
        ),
    );

    for (const nextAssignment of nextPermissions) {
        const currentAssignment =
            currentPermissionsById.get(
                nextAssignment.assignmentId,
            );

        if (
            currentAssignment &&
            stateChanged(
                currentAssignment,
                nextAssignment,
            )
        ) {
            changes.push({
                operation: "update",
                collection:
                    dependencies.collections
                        .permissionAssignments,
                documentId:
                    nextAssignment.assignmentId,
                patch: {
                    ...nextAssignment,
                },
            });
        }
    }

    return changes;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP ASSIGNMENT LOADER
// -----------------------------------------------------------------------------

export async function loadMembershipAssignments(
    dependencies: AccessUseCaseDependencies,
    membershipId: string,
): Promise<LoadedAssignmentState> {
    const [
        roles,
        permissions,
    ] = await Promise.all([
        dependencies.readStore
            .listRoleAssignments(
                membershipId,
            ),
        dependencies.readStore
            .listPermissionAssignments(
                membershipId,
            ),
    ]);

    return {
        roles,
        permissions,
    };
}

// -----------------------------------------------------------------------------
// IDENTITY ASSIGNMENT LOADER
// -----------------------------------------------------------------------------

export async function loadIdentityAssignments(
    dependencies: AccessUseCaseDependencies,
    identityId: string,
): Promise<LoadedAssignmentState> {
    const memberships =
        await dependencies.readStore
            .listKnownMemberships(
                identityId,
            );

    const assignmentGroups =
        await Promise.all(
            memberships.map(
                (membership) =>
                    loadMembershipAssignments(
                        dependencies,
                        membership.membershipId,
                    ),
            ),
        );

    return {
        roles: assignmentGroups.flatMap(
            (group) => group.roles,
        ),
        permissions: assignmentGroups.flatMap(
            (group) => group.permissions,
        ),
    };
}

// -----------------------------------------------------------------------------
// LIFECYCLE COMMIT
// -----------------------------------------------------------------------------

export async function commitLifecycle(
    input: {
        readonly dependencies:
        AccessUseCaseDependencies;
        readonly aggregateType: string;
        readonly aggregateId: string;
        readonly eventType: string;
        readonly subject: string;
        readonly now: string;
        readonly payload:
        Record<string, unknown>;
        readonly stateChanges:
        readonly AccessStateChange[];
    },
): Promise<boolean> {
    if (input.stateChanges.length === 0) {
        return false;
    }

    await commitAccess(
        input.dependencies.engine,
        {
            aggregateType:
                input.aggregateType,
            aggregateId:
                input.aggregateId,
            stateChanges:
                input.stateChanges,
            events: [
                {
                    eventId:
                        input.dependencies.ids
                            .eventId(),
                    eventType:
                        input.eventType,
                    aggregateType:
                        input.aggregateType,
                    aggregateId:
                        input.aggregateId,
                    occurredAt:
                        input.now,
                    payload:
                        input.payload,
                },
            ],
            outbox: [
                {
                    messageId:
                        input.dependencies.ids
                            .outboxMessageId(),
                    subject:
                        input.subject,
                    occurredAt:
                        input.now,
                    payload:
                        input.payload,
                },
            ],
        },
    );

    return true;
}