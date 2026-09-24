// services/access/src/runtime/composition/compose-access-service-components.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS SERVICE COMPONENTS
// -----------------------------------------------------------------------------
// Production composition root for Access Operations™ runtime components.
//
// Purpose:
//   • compose Access-owned Mongo read infrastructure
//   • compose Access use cases and the public API façade
//   • compose HTTP routes and inbound reaction dispatch
//   • keep application-server integration thin
//
// Boundary:
//   • receives shared platform infrastructure
//   • does not create or close shared platform resources
//   • does not start the Access lifecycle runtime
//   • contains no Access business rules
// -----------------------------------------------------------------------------

import type {
    FolksdoEngine as PlatformFolksdoEngine,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    Db,
} from "mongodb";

import {
    AccessValidationHttpError,
    createAccessApi,
    getAccessRoutePermission,
    toAuthorizationDecisionDto,
    toPermissionDto,
    toRoleDto,
    type AccessApiRequestContext,
    type AccessApiRequestContextResolver,
    type AccessApiValidation,
    type CreateAccessApiDependencies,
} from "../../api";

import {
    assignRoleRequestSchema,
    createPermissionRequestSchema,
    createRoleRequestSchema,
    listPermissionAssignmentsQuerySchema,
    listPermissionsQuerySchema,
    listRoleAssignmentsQuerySchema,
    listRolesQuerySchema,
    removeRoleRequestSchema,
    revokePermissionRequestSchema,
    grantPermissionRequestSchema,
    archiveRoleRequestSchema,
    authorizeRequestSchema,
    archivePolicyRequestSchema,
    createPolicyRequestSchema,
    createRestrictionRequestSchema,
    listPoliciesQuerySchema,
    listRestrictionsQuerySchema,
    removeRestrictionRequestSchema,
    updatePolicyRequestSchema,
    restoreRoleRequestSchema,
    updateRoleRequestSchema,
    type AccessRequestSchema,
} from "../../api/validation";

import {
    AccessAdministrativeAuthorizer,
    type AccessKnownFactsStore,
    type AccessOutboxSubjects,
    type AccessReadStore,
    type AccessStateChange,
    type AccessUseCaseDependencies,
    type FolksdoEngine as AccessCommitEngine,
    type ListRolesRequest,
} from "../../usecases";

import {
    AccessAdministrativeAuthorizationDeniedError,
} from "../../errors";

import {
    composeAccessReadStore,
} from "./compose-access-read-store";

import {
    composeAccessUseCases,
} from "./compose-access-usecases";

import {
    composeAccessReactions,
} from "./compose-access-reactions";

import {
    createAccessReactionRegistrations,
} from "./create-access-reaction-registrations";

import {
    composeAccessRoutes,
} from "./compose-access-routes";

import {
    composeAccessWorkers,
} from "./compose-access-workers";

import type {
    AccessRuntimeComponents,
} from "../access-runtime-contracts";

import type {
    AccessClock,
    AccessIdGenerator,
} from "../../usecases";

import {
    evaluateAuthorizationPolicy,
} from "../../authorization";

import type {
    MongoAccessCollectionNames,
} from "../../read-store";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessServiceComponentsInput {
    readonly database:
    Db;

    readonly engine:
    Pick<PlatformFolksdoEngine, "state">;

    readonly collections:
    MongoAccessCollectionNames;

    readonly clock:
    AccessClock;

    readonly ids:
    AccessIdGenerator;

    readonly outboxSubjects:
    AccessOutboxSubjects;

    readonly contextResolver:
    AccessApiRequestContextResolver;
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessServiceComponents(
    input:
        ComposeAccessServiceComponentsInput,
): AccessRuntimeComponents {
    const composedReadStore =
        composeAccessReadStore({
            database:
                input.database,

            collections:
                input.collections,
        });

    const readStore =
        composedReadStore.readStore;

    const dependencies:
        AccessUseCaseDependencies = {
        engine:
            createAccessCommitEngine(
                input.engine,
                input.collections,
            ),

        readStore:
            createAccessUseCaseReadStore(
                readStore,
            ),

        knownFactsStore:
            createAccessKnownFactsStore(
                readStore,
            ),

        clock:
            input.clock,

        ids:
            input.ids,

        collections: {
            permissions:
                input.collections.permissions,

            roles:
                input.collections.roles,

            roleAssignments:
                input.collections.roleAssignments,

            permissionAssignments:
                input.collections.permissionAssignments,

            authorizationPolicies:
                input.collections.policies,

            accessRestrictions:
                input.collections.restrictions,

            knownIdentities:
                input.collections.knownIdentities,

            knownMemberships:
                input.collections.knownMemberships,

            knownTenants:
                input.collections.knownTenants,

            knownSubscriptionCapabilities:
                input.collections.knownSubscriptionCapabilities,
        },

        outboxSubjects:
            input.outboxSubjects,
    };

    const useCases =
        composeAccessUseCases(
            dependencies,
        );

    const administrativeAuthorizer =
        new AccessAdministrativeAuthorizer({
            authorizeAction:
                useCases.authorization.authorizeAction,
        });

    const api =
        createAccessApi(
            createAccessApiOperations({
                useCases,
                readStore,
                administrativeAuthorizer,
            }),
        );

    const routes =
        composeAccessRoutes({
            api,

            contextResolver:
                input.contextResolver,

            validation:
                createAccessApiValidation(),
        });

    const workers =
        composeAccessWorkers({
            assignments: {
                clock:
                    createAccessWorkerClock(
                        input.clock,
                    ),

                readStore: {
                    async listExpirableAssignments(
                        request,
                    ) {
                        const [
                            roleAssignments,
                            permissionAssignments,
                        ] = await Promise.all([
                            readStore.listRoleAssignments(),
                            readStore.listPermissionAssignments(),
                        ]);

                        return [
                            ...roleAssignments,
                            ...permissionAssignments,
                        ]
                            .filter(
                                assignment =>
                                    assignment.status === "active"
                                    && assignment.expiresAt !== undefined
                                    && toAccessWorkerDate(
                                        assignment.expiresAt,
                                    ).getTime() <= request.now.getTime(),
                            )
                            .sort(
                                (left, right) =>
                                    left.assignmentId.localeCompare(
                                        right.assignmentId,
                                    ),
                            )
                            .slice(
                                0,
                                request.limit,
                            )
                            .map(
                                assignment => ({
                                    assignmentId:
                                        assignment.assignmentId,

                                    expiresAt:
                                        toAccessWorkerDate(
                                            assignment.expiresAt!,
                                        ),
                                }),
                            );
                    },
                },

                expireAssignment: {
                    async execute(
                        request,
                    ) {
                        const roleAssignment =
                            await readStore.findRoleAssignmentById(
                                request.assignmentId,
                            );

                        if (
                            roleAssignment !== null
                        ) {
                            await useCases.expirations.assignment.execute({
                                assignmentType:
                                    "role",

                                assignmentId:
                                    request.assignmentId,
                            });

                            return {
                                changed:
                                    true,
                            };
                        }

                        const permissionAssignment =
                            await readStore.findPermissionAssignmentById(
                                request.assignmentId,
                            );

                        if (
                            permissionAssignment !== null
                        ) {
                            await useCases.expirations.assignment.execute({
                                assignmentType:
                                    "permission",

                                assignmentId:
                                    request.assignmentId,
                            });

                            return {
                                changed:
                                    true,
                            };
                        }

                        return {
                            changed:
                                false,
                        };
                    },
                },

                observability:
                    createExpireAssignmentsWorkerObservability(),
            },

            restrictions: {
                clock:
                    createAccessWorkerClock(
                        input.clock,
                    ),

                readStore: {
                    async listExpirableRestrictions(
                        request,
                    ) {
                        const restrictions =
                            await readStore.listRestrictions();

                        return restrictions
                            .filter(
                                restriction =>
                                    restriction.status === "active"
                                    && restriction.expiresAt !== undefined
                                    && toAccessWorkerDate(
                                        restriction.expiresAt,
                                    ).getTime() <= request.now.getTime(),
                            )
                            .sort(
                                (left, right) =>
                                    left.restrictionId.localeCompare(
                                        right.restrictionId,
                                    ),
                            )
                            .slice(
                                0,
                                request.limit,
                            )
                            .map(
                                restriction => ({
                                    restrictionId:
                                        restriction.restrictionId,

                                    expiresAt:
                                        toAccessWorkerDate(
                                            restriction.expiresAt!,
                                        ),
                                }),
                            );
                    },
                },

                expireRestriction: {
                    async execute(
                        request,
                    ) {
                        const restriction =
                            await readStore.findRestrictionById(
                                request.restrictionId,
                            );

                        if (
                            restriction === null
                        ) {
                            return {
                                changed:
                                    false,
                            };
                        }

                        await useCases.expirations.restriction.execute({
                            restrictionId:
                                request.restrictionId,
                        });

                        return {
                            changed:
                                true,
                        };
                    },
                },

                observability:
                    createExpireRestrictionsWorkerObservability(),
            },
        });

    return {
        api,

        reactions:
            composeAccessReactions({
                registrations:
                    createAccessReactionRegistrations({
                        useCases,
                    }),
            }),

        routes,

        readStore:
            composedReadStore,

        useCases,

        workers,
    };
}

// -----------------------------------------------------------------------------
// WORKER ADAPTERS
// -----------------------------------------------------------------------------

function createAccessWorkerClock(
    clock:
        AccessClock,
): {
    now(): Date;
} {
    return {
        now() {
            return toAccessWorkerDate(
                clock.now(),
            );
        },
    };
}

function toAccessWorkerDate(
    value:
        string,
): Date {
    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new TypeError(
            `Invalid Access worker timestamp: ${value}.`,
        );
    }

    return date;
}

function createExpireAssignmentsWorkerObservability() {
    return {
        executionStarted() {
            // Runtime-level logging may be composed here without changing the
            // worker or Access business behavior.
        },

        assignmentExpired() {
            // Intentionally provider-neutral.
        },

        assignmentUnchanged() {
            // Intentionally provider-neutral.
        },

        assignmentFailed() {
            // Intentionally provider-neutral.
        },

        executionCompleted() {
            // Intentionally provider-neutral.
        },
    };
}

function createExpireRestrictionsWorkerObservability() {
    return {
        executionStarted() {
            // Runtime-level logging may be composed here without changing the
            // worker or Access business behavior.
        },

        restrictionExpired() {
            // Intentionally provider-neutral.
        },

        restrictionUnchanged() {
            // Intentionally provider-neutral.
        },

        restrictionFailed() {
            // Intentionally provider-neutral.
        },

        executionCompleted() {
            // Intentionally provider-neutral.
        },
    };
}

// -----------------------------------------------------------------------------
// KNOWN FACTS ADAPTER
// -----------------------------------------------------------------------------

function createAccessKnownFactsStore(
    readStore:
        ReturnType<typeof composeAccessReadStore>["readStore"],
): AccessKnownFactsStore {
    const toDocumentId = (
        value: string,
    ): string =>
        value;

    return {
        async findIdentity(
            identityId,
        ) {
            const identity =
                await readStore.findKnownIdentity(
                    identityId,
                );

            return identity === null
                ? null
                : {
                    documentId:
                        toDocumentId(
                            identity.identityId,
                        ),
                    identityId:
                        identity.identityId,
                    status:
                        identity.status,
                    updatedAt:
                        identity.updatedAt,
                    disabledAt:
                        identity.disabledAt,
                    archivedAt:
                        identity.archivedAt,
                    restoredAt:
                        identity.restoredAt,
                };
        },

        async findMembership(
            membershipId,
        ) {
            const membership =
                await readStore.findKnownMembership(
                    membershipId,
                );

            return membership === null
                ? null
                : mapKnownMembership(
                    membership,
                );
        },

        async listMembershipsByIdentity(
            identityId,
        ) {
            const memberships =
                await readStore.listKnownMemberships(
                    identityId,
                );

            return memberships.map(
                mapKnownMembership,
            );
        },

        async findTenant(
            tenantId,
        ) {
            const tenant =
                await readStore.findKnownTenant(
                    tenantId,
                );

            return tenant === null
                ? null
                : {
                    documentId:
                        toDocumentId(
                            tenant.tenantId,
                        ),
                    tenantId:
                        tenant.tenantId,
                    status:
                        tenant.status,
                    createdAt:
                        tenant.createdAt,
                    activatedAt:
                        tenant.activatedAt,
                    suspendedAt:
                        tenant.suspendedAt,
                    reactivatedAt:
                        tenant.reactivatedAt,
                    archivedAt:
                        tenant.archivedAt,
                    updatedAt:
                        tenant.updatedAt,
                };
        },

        async findTenantCapability(
            tenantId,
            capability,
        ) {
            const capabilities =
                await readStore.findKnownSubscriptionCapabilities(
                    tenantId,
                );

            if (
                capabilities === null
                || !capabilities.capabilities.includes(
                    capability,
                )
            ) {
                return null;
            }

            return mapKnownSubscriptionCapability(
                tenantId,
                capability,
                capabilities.status === "active",
                capabilities.updatedAt,
            );
        },

        async listTenantCapabilities(
            tenantId,
        ) {
            const capabilities =
                await readStore.findKnownSubscriptionCapabilities(
                    tenantId,
                );

            if (
                capabilities === null
            ) {
                return [];
            }

            return capabilities.capabilities.map(
                capability =>
                    mapKnownSubscriptionCapability(
                        tenantId,
                        capability,
                        capabilities.status === "active",
                        capabilities.updatedAt,
                    ),
            );
        },

        async identityIsAvailable(
            identityId,
        ) {
            const identity =
                await readStore.findKnownIdentity(
                    identityId,
                );

            return identity?.status === "active";
        },

        async tenantIsAvailable(
            tenantId,
        ) {
            const tenant =
                await readStore.findKnownTenant(
                    tenantId,
                );

            return tenant?.status === "active";
        },

        async tenantCapabilityIsEnabled(
            tenantId,
            capability,
        ) {
            const capabilities =
                await readStore.findKnownSubscriptionCapabilities(
                    tenantId,
                );

            return (
                capabilities?.status === "active"
                && capabilities.capabilities.includes(
                    capability,
                )
            );
        },
    };
}

function mapKnownMembership(
    membership:
        Awaited<ReturnType<ReturnType<typeof composeAccessReadStore>["readStore"]["findKnownMembership"]>> extends infer T
        ? Exclude<T, null>
        : never,
): Awaited<ReturnType<AccessKnownFactsStore["findMembership"]>> extends infer T
    ? Exclude<T, null>
    : never {
    return {
        documentId:
            membership.membershipId,
        membershipId:
            membership.membershipId,
        identityId:
            membership.identityId,
        tenantId:
            membership.tenantId,
        status:
            membership.status,
        updatedAt:
            membership.updatedAt,
    };
}

function mapKnownSubscriptionCapability(
    tenantId: string,
    capability: string,
    enabled: boolean,
    updatedAt: string,
): Awaited<ReturnType<AccessKnownFactsStore["findTenantCapability"]>> extends infer T
    ? Exclude<T, null>
    : never {
    return {
        documentId:
            `${tenantId}:${capability}`,
        tenantId,
        capability,
        status:
            enabled
                ? "enabled"
                : "disabled",
        updatedAt,
        enabledAt:
            enabled
                ? updatedAt
                : undefined,
        disabledAt:
            enabled
                ? undefined
                : updatedAt,
    };
}

// -----------------------------------------------------------------------------
// ENGINE ADAPTER
// -----------------------------------------------------------------------------

function createAccessCommitEngine(
    engine:
        Pick<PlatformFolksdoEngine, "state">,
    collections:
        MongoAccessCollectionNames,
): AccessCommitEngine {
    return {
        async commit(
            command,
        ) {
            const result =
                await engine.state.commit({
                    aggregate: {
                        aggregateType:
                            command.aggregateType,
                        aggregateId:
                            command.aggregateId,
                    },
                    expectedVersion:
                        command.expectedVersion,
                    stateChanges:
                        command.stateChanges.map(
                            stateChange =>
                                mapAccessStateChange(
                                    stateChange,
                                    collections,
                                ),
                        ),
                    events:
                        command.events,
                    outbox:
                        command.outbox,
                } as never);

            const committed =
                result as {
                    readonly version?: number;
                    readonly committedVersion?: number;
                    readonly eventsCommitted?: number;
                    readonly eventCount?: number;
                    readonly outboxMessagesCommitted?: number;
                    readonly outboxMessageCount?: number;
                };

            return {
                committedVersion:
                    committed.committedVersion
                    ?? committed.version
                    ?? 0,
                stateChangeCount:
                    command.stateChanges.length,
                eventCount:
                    committed.eventsCommitted
                    ?? committed.eventCount
                    ?? command.events.length,
                outboxMessageCount:
                    committed.outboxMessagesCommitted
                    ?? committed.outboxMessageCount
                    ?? command.outbox.length,
            };
        },
    };
}

// -----------------------------------------------------------------------------
// ENGINE STATE-CHANGE ADAPTER
// -----------------------------------------------------------------------------

function mapAccessStateChange(
    stateChange:
        AccessStateChange,
    collections:
        MongoAccessCollectionNames,
): StateChange {
    if (
        stateChange.operation === "insert"
    ) {
        return {
            operation:
                "insert",
            collection:
                stateChange.collection,
            document:
                stateChange.document,
        };
    }

    return {
        operation:
            "update",
        collection:
            stateChange.collection,
        key:
            createAccessStateChangeKey(
                stateChange.collection,
                stateChange.documentId,
                collections,
            ),
        patch:
            stateChange.patch,
    };
}

function createAccessStateChangeKey(
    collection:
        string,
    documentId:
        string,
    collections:
        MongoAccessCollectionNames,
): Readonly<Record<string, unknown>> {
    if (
        collection === collections.permissions
    ) {
        return {
            permissionId:
                documentId,
        };
    }

    if (
        collection === collections.roles
    ) {
        return {
            roleId:
                documentId,
        };
    }

    if (
        collection === collections.roleAssignments
        || collection === collections.permissionAssignments
    ) {
        return {
            assignmentId:
                documentId,
        };
    }

    if (
        collection === collections.policies
    ) {
        return {
            policyId:
                documentId,
        };
    }

    if (
        collection === collections.restrictions
    ) {
        return {
            restrictionId:
                documentId,
        };
    }

    if (
        collection === collections.knownIdentities
    ) {
        return {
            identityId:
                documentId,
        };
    }

    if (
        collection === collections.knownMemberships
    ) {
        return {
            membershipId:
                documentId,
        };
    }

    if (
        collection === collections.knownTenants
        || collection === collections.knownSubscriptionCapabilities
    ) {
        return {
            tenantId:
                documentId,
        };
    }

    throw new TypeError(
        `Unsupported Access state-change collection: ${collection}.`,
    );
}

// -----------------------------------------------------------------------------
// USE-CASE READ-STORE ADAPTER
// -----------------------------------------------------------------------------

function createAccessUseCaseReadStore(
    readStore:
        ReturnType<typeof composeAccessReadStore>["readStore"],
): AccessReadStore {
    return {
        findKnownIdentity:
            identityId =>
                readStore.findKnownIdentity(
                    identityId,
                ),
        findKnownMembership:
            membershipId =>
                readStore.findKnownMembership(
                    membershipId,
                ),
        listKnownMemberships:
            (identityId, tenantId) =>
                readStore.listKnownMemberships(
                    identityId,
                    tenantId,
                ),
        findKnownTenant:
            tenantId =>
                readStore.findKnownTenant(
                    tenantId,
                ),
        findKnownSubscriptionCapabilities:
            tenantId =>
                readStore.findKnownSubscriptionCapabilities(
                    tenantId,
                ),
        listRoleAssignments:
            (membershipId, identityId) =>
                readStore.listRoleAssignments(
                    membershipId,
                    identityId,
                ),
        listPermissionAssignments:
            (membershipId, identityId) =>
                readStore.listPermissionAssignments(
                    membershipId,
                    identityId,
                ),
        findRoleById:
            roleId =>
                readStore.findRoleById(
                    roleId,
                ),
        findRoleByName:
            (name, tenantId) =>
                readStore.findRoleByName(
                    name,
                    tenantId,
                ),
        listRoles:
            tenantId =>
                readStore.listRoles(
                    tenantId,
                ),
        findPermissionById:
            permissionId =>
                readStore.findPermissionById(
                    permissionId,
                ),
        findPermissionByKey:
            (service, resource, action) =>
                readStore.findPermissionByKey(
                    service,
                    resource,
                    action,
                ),
        findPermissionsByIds:
            permissionIds =>
                readStore.findPermissionsByIds(
                    permissionIds,
                ),
        listPermissions:
            () =>
                readStore.listPermissions(),
        findRoleAssignmentById:
            assignmentId =>
                readStore.findRoleAssignmentById(
                    assignmentId,
                ),
        findPermissionAssignmentById:
            assignmentId =>
                readStore.findPermissionAssignmentById(
                    assignmentId,
                ),
        async findActiveRoleAssignment(
            membershipId,
            roleId,
            tenantId,
        ) {
            const assignments =
                await readStore.listRoleAssignments(
                    membershipId,
                );

            return assignments.find(
                assignment =>
                    assignment.roleId === roleId
                    && assignment.tenantId === tenantId
                    && assignment.status === "active",
            ) ?? null;
        },
        async findActivePermissionAssignment(
            membershipId,
            permissionId,
            tenantId,
        ) {
            const assignments =
                await readStore.listPermissionAssignments(
                    membershipId,
                );

            return assignments.find(
                assignment =>
                    assignment.permissionId === permissionId
                    && assignment.tenantId === tenantId
                    && assignment.status === "active",
            ) ?? null;
        },
        async listRoleAssignmentsByMembership(
            membershipId,
            tenantId,
        ) {
            const assignments =
                await readStore.listRoleAssignments(
                    membershipId,
                );

            return assignments.filter(
                assignment =>
                    assignment.tenantId === tenantId,
            );
        },
        async listPermissionAssignmentsByMembership(
            membershipId,
            tenantId,
        ) {
            const assignments =
                await readStore.listPermissionAssignments(
                    membershipId,
                );

            return assignments.filter(
                assignment =>
                    assignment.tenantId === tenantId,
            );
        },
        async listAssignmentsByTenant(
            tenantId,
        ) {
            const [
                roleAssignments,
                permissionAssignments,
            ] =
                await Promise.all([
                    readStore.listRoleAssignments(),
                    readStore.listPermissionAssignments(),
                ]);

            return {
                roleAssignments:
                    roleAssignments.filter(
                        assignment =>
                            assignment.tenantId === tenantId,
                    ),
                permissionAssignments:
                    permissionAssignments.filter(
                        assignment =>
                            assignment.tenantId === tenantId,
                    ),
            };
        },
        findPolicyById:
            policyId =>
                readStore.findPolicyById(
                    policyId,
                ),
        listPolicies:
            tenantId =>
                readStore.listPolicies(
                    tenantId,
                ),
        findRestrictionById:
            restrictionId =>
                readStore.findRestrictionById(
                    restrictionId,
                ),
        listRestrictions:
            tenantId =>
                readStore.listRestrictions(
                    tenantId,
                ),
        async listApplicableRestrictions(
            membershipId,
            tenantId,
            permissionId,
            resourceType,
            resourceId,
        ) {
            const restrictions =
                await readStore.listRestrictions(
                    tenantId,
                );

            return restrictions.filter(
                restriction => {
                    const target =
                        restriction.target;

                    switch (target.targetType) {
                        case "membership":
                            return (
                                target.membershipId
                                === membershipId
                            );

                        case "tenant":
                            return (
                                target.tenantId
                                === tenantId
                            );

                        case "permission":
                            return (
                                permissionId !== undefined
                                && target.permissionId
                                === permissionId
                            );

                        case "role":
                            return true;

                        case "resource_type":
                            return (
                                target.resourceType
                                === resourceType
                            );

                        case "resource_instance":
                            return (
                                target.resourceType
                                === resourceType
                                && target.resourceId
                                === resourceId
                            );
                    }
                },
            );
        },
        listRolePermissionBindings:
            async roleIds => {
                const roles =
                    await readStore.findRolesByIds(
                        roleIds,
                    );

                return roles.flatMap(
                    role =>
                        (
                            role.permissionIds
                            ?? []
                        ).map(
                            permissionId => ({
                                roleId:
                                    role.roleId,

                                permissionId,
                            }),
                        ),
                );
            },
        async evaluateActivePolicies(
            input,
        ) {
            const policies =
                await readStore.listPolicies(
                    input.tenantId,
                );

            return policies.flatMap(
                policy => {
                    const result =
                        evaluateAuthorizationPolicy({
                            policy,

                            identityId:
                                input.identityId,

                            membershipId:
                                input.membershipId,

                            tenantId:
                                input.tenantId,

                            permissionId:
                                input.permissionId,

                            ...(input.resourceType === undefined
                                ? {}
                                : {
                                    resourceType:
                                        input.resourceType,
                                }),

                            ...(input.resourceId === undefined
                                ? {}
                                : {
                                    resourceId:
                                        input.resourceId,
                                }),
                        });

                    return result === null
                        ? []
                        : [result];
                },
            );
        },
    };
}

// -----------------------------------------------------------------------------
// API OPERATIONS
// -----------------------------------------------------------------------------

function createAccessApiOperations(
    input: {
        readonly useCases:
        ReturnType<typeof composeAccessUseCases>;

        readonly readStore:
        ReturnType<typeof composeAccessReadStore>["readStore"];

        readonly administrativeAuthorizer:
        AccessAdministrativeAuthorizer;
    },
): CreateAccessApiDependencies {
    const actorId = (
        context: AccessApiRequestContext,
    ): string =>
        context.actor.actorId;

    const administrativeContext = (
        context: AccessApiRequestContext,
    ) => {
        if (
            context.trustedExecution?.boundary
            === "security_foundation"
            && context.actor.actorType
            === "system"
        ) {
            return {
                identityId:
                    context.actor.actorId,

                trustedExecution:
                    context.trustedExecution,
            } as const;
        }

        const membershipId =
            context.membershipId?.trim()
            ?? "";

        const tenantId =
            context.tenant?.tenantId.trim()
            ?? "";

        if (
            membershipId.length === 0
            || tenantId.length === 0
        ) {
            throw new AccessAdministrativeAuthorizationDeniedError(
                "authorization_context_invalid",
            );
        }

        return {
            identityId:
                context.actor.actorId,

            membershipId,

            tenantId,
        } as const;
    };

    const requireTenantAdministrativeContext = (
        context: AccessApiRequestContext,
    ) => {
        const resolved =
            administrativeContext(
                context,
            );

        if (
            "trustedExecution"
            in resolved
        ) {
            throw new AccessAdministrativeAuthorizationDeniedError(
                "authorization_scope_invalid",
            );
        }

        return resolved;
    };

    const isTrustedSecurityFoundationContext = (
        context: AccessApiRequestContext,
    ): boolean =>
        context.actor.actorType === "system"
        && context.trustedExecution?.boundary
        === "security_foundation";

    const assertMembershipInTenant = async (
        membershipId: string,
        tenantId: string,
    ): Promise<void> => {
        const membership =
            await input.readStore.findKnownMembership(
                membershipId,
            );

        if (
            membership === null
            || membership.tenantId !== tenantId
        ) {
            throw new AccessAdministrativeAuthorizationDeniedError(
                "authorization_scope_invalid",
            );
        }
    };

    const assertDelegatedPermission = async (
        permissionId: string,
        context: AccessApiRequestContext,
    ): Promise<void> => {
        const permission =
            await input.readStore.findPermissionById(
                permissionId,
            );

        if (
            permission === null
        ) {
            throw new AccessAdministrativeAuthorizationDeniedError(
                "authorization_scope_invalid",
            );
        }

        await input.administrativeAuthorizer.assertPermissionAuthorized(
            {
                permission: {
                    service:
                        permission.service,

                    resource:
                        permission.resource,

                    action:
                        permission.action,
                },

                resourceType:
                    "permission",

                resourceId:
                    permission.permissionId,
            },
            administrativeContext(
                context,
            ),
        );
    };

    const authorizeAdministrativeOperation = async (
        operation: Parameters<typeof getAccessRoutePermission>[0],
        context: AccessApiRequestContext,
        resourceType: string,
        resourceId?: string,
    ): Promise<void> => {
        await input.administrativeAuthorizer.assertAuthorized(
            {
                permission:
                    getAccessRoutePermission(
                        operation,
                    ),

                resourceType,

                ...(resourceId === undefined
                    ? {}
                    : {
                        resourceId,
                    }),
            },
            administrativeContext(
                context,
            ),
        );
    };

    const operations = {
        createPermission: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "createPermission",
                context,
                "permission",
            );

            if (
                !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            const [service, resource, action] = String(request.key ?? "").split(".");

            const permission =
                await input.useCases.permissions.create.execute({
                    service,
                    resource,
                    action,
                    displayName: String(request.name ?? request.key ?? ""),
                    description: String(request.description ?? ""),
                    classification: request.scope === "platform" ? "platform" : "tenant",
                    createdBy: actorId(context),
                } as Parameters<typeof input.useCases.permissions.create.execute>[0]);

            return toPermissionDto({
                permission,
                scope: permission.classification === "platform" ? "platform" : "tenant",
                status: "active",
                updatedAt: permission.createdAt,
            });
        },

        getPermission: async (permissionId: string, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "getPermission",
                context,
                "permission",
                permissionId,
            );

            const permission =
                await input.useCases.permissions.get.execute({
                    permissionId,
                });

            return toPermissionDto({
                permission,
                scope: permission.classification === "platform" ? "platform" : "tenant",
                status: "active",
                updatedAt: permission.createdAt,
            });
        },

        listPermissions: async (query: unknown, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listPermissions",
                context,
                "permission",
            );

            const permissions =
                await input.useCases.permissions.list.execute(
                    query as Parameters<
                        typeof input.useCases.permissions.list.execute
                    >[0],
                );

            const items =
                permissions.map(
                    permission =>
                        toPermissionDto({
                            permission,
                            scope: permission.classification === "platform" ? "platform" : "tenant",
                            status: "active",
                            updatedAt: permission.createdAt,
                        }),
                );

            return {
                items,
                count: items.length,
            };
        },

        createRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "createRole",
                context,
                "role",
            );

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const role =
                    await input.useCases.roles.create.execute({
                        key:
                            request.key,
                        roleType:
                            request.type,
                        tenantId:
                            request.tenantId,
                        name:
                            request.name,
                        description:
                            request.description,
                        permissionIds:
                            request.permissionIds,
                        createdBy:
                            actorId(context),
                    } as Parameters<typeof input.useCases.roles.create.execute>[0]);

                return toRoleDto({
                    role,
                });
            }

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            if (
                request.type !== "tenant"
                || (
                    request.tenantId !== undefined
                    && request.tenantId !== execution.tenantId
                )
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            const permissionIds =
                Array.isArray(
                    request.permissionIds,
                )
                    ? request.permissionIds.filter(
                        (value): value is string =>
                            typeof value === "string",
                    )
                    : [];

            for (
                const permissionId
                of permissionIds
            ) {
                await assertDelegatedPermission(
                    permissionId,
                    context,
                );
            }

            const role =
                await input.useCases.roles.create.execute({
                    key:
                        request.key,
                    roleType:
                        "tenant",
                    tenantId:
                        execution.tenantId,
                    name:
                        request.name,
                    description:
                        request.description,
                    permissionIds,
                    createdBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.roles.create.execute>[0]);

            return toRoleDto({
                role,
            });
        },

        updateRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const roleId =
                String(
                    request.roleId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "updateRole",
                context,
                "role",
                roleId,
            );

            const role =
                await input.readStore.findRoleById(
                    roleId,
                );

            if (
                role === null
            ) {
                return input.useCases.roles.update.execute({
                    ...request,
                    updatedBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.roles.update.execute>[0]);
            }

            if (
                !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    role.roleType !== "tenant"
                    || role.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }

                if (
                    Array.isArray(
                        request.permissionIds,
                    )
                ) {
                    for (
                        const permissionId
                        of request.permissionIds
                    ) {
                        if (
                            typeof permissionId
                            === "string"
                        ) {
                            await assertDelegatedPermission(
                                permissionId,
                                context,
                            );
                        }
                    }
                }
            }

            const updatedRole =
                await input.useCases.roles.update.execute({
                    ...request,
                    updatedBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.roles.update.execute>[0]);

            return toRoleDto({
                role:
                    updatedRole,
            });
        },

        archiveRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const roleId =
                String(
                    request.roleId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "archiveRole",
                context,
                "role",
                roleId,
            );

            const role =
                await input.readStore.findRoleById(
                    roleId,
                );

            if (
                role !== null
                && !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    role.roleType !== "tenant"
                    || role.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            const archivedRole =
                await input.useCases.roles.archive.execute({
                    ...request,
                    archivedBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.roles.archive.execute>[0]);

            return toRoleDto({
                role:
                    archivedRole,
            });
        },

        restoreRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const roleId =
                String(
                    request.roleId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "restoreRole",
                context,
                "role",
                roleId,
            );

            const role =
                await input.readStore.findRoleById(
                    roleId,
                );

            if (
                role !== null
                && !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    role.roleType !== "tenant"
                    || role.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            const restoredRole =
                await input.useCases.roles.restore.execute({
                    ...request,
                    restoredBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.roles.restore.execute>[0]);

            return toRoleDto({
                role:
                    restoredRole,
            });
        },

        getRole: async (roleId: string, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "getRole",
                context,
                "role",
                roleId,
            );

            const role =
                await input.useCases.roles.get.execute({
                    roleId,
                });

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                return toRoleDto({
                    role,
                });
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            if (
                role.roleType !== "tenant"
                || role.tenantId !== tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            return toRoleDto({
                role,
            });
        },

        listRoles: async (query: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listRoles",
                context,
                "role",
            );

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
                || context.tenant?.tenantType
                === "platform"
            ) {
                const roles =
                    await input.useCases.roles.list.execute({
                        tenantId:
                            query.tenantId as string | undefined,

                        roleType:
                            query.type as ListRolesRequest["roleType"],

                        lifecycleStatus:
                            query.status as ListRolesRequest["lifecycleStatus"],
                    });

                const search =
                    typeof query.search === "string"
                        ? query.search.trim().toLowerCase()
                        : "";

                const filtered =
                    roles
                        .map(
                            role =>
                                toRoleDto({
                                    role,
                                }),
                        )
                        .filter(
                            role =>
                                search.length === 0
                                || role.key.toLowerCase().includes(search)
                                || role.name.toLowerCase().includes(search)
                                || role.description?.toLowerCase().includes(search)
                                === true,
                        );

                const offset =
                    typeof query.offset === "number"
                        ? query.offset
                        : 0;

                const limit =
                    typeof query.limit === "number"
                        ? query.limit
                        : filtered.length;

                const items =
                    filtered.slice(
                        offset,
                        offset + limit,
                    );

                return {
                    items,
                    count:
                        items.length,
                    total:
                        filtered.length,
                    limit,
                    offset,
                };
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            const roles =
                await input.useCases.roles.list.execute({
                    ...(query as Record<string, unknown>),
                    tenantId,
                    roleType:
                        "tenant",
                } as Parameters<typeof input.useCases.roles.list.execute>[0]);

            const items =
                roles.map(
                    role =>
                        toRoleDto({
                            role,
                        }),
                );

            return {
                items,
                count:
                    items.length,
            };
        },

        assignRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const roleId =
                String(
                    request.roleId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "assignRole",
                context,
                "role",
                roleId,
            );

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            const membershipId =
                String(
                    request.membershipId
                    ?? request.subjectId
                    ?? "",
                );

            await assertMembershipInTenant(
                membershipId,
                execution.tenantId,
            );

            const role =
                await input.readStore.findRoleById(
                    roleId,
                );

            if (
                role === null
                || role.roleType !== "tenant"
                || role.tenantId !== execution.tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            for (
                const permissionId
                of role.permissionIds
            ) {
                await assertDelegatedPermission(
                    permissionId,
                    context,
                );
            }

            return input.useCases.roles.assign.execute({
                roleId,
                membershipId,
                tenantId:
                    execution.tenantId,
                assignedBy:
                    actorId(context),
                expiresAt:
                    request.expiresAt,
            } as Parameters<typeof input.useCases.roles.assign.execute>[0]);
        },

        removeRole: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const assignmentId =
                String(
                    request.assignmentId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "removeRole",
                context,
                "role-assignment",
                assignmentId,
            );

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            const assignment =
                await input.readStore.findRoleAssignmentById(
                    assignmentId,
                );

            if (
                assignment !== null
                && assignment.tenantId !== execution.tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            if (
                assignment !== null
            ) {
                const role =
                    await input.readStore.findRoleById(
                        assignment.roleId,
                    );

                if (
                    role === null
                    || role.roleType !== "tenant"
                    || role.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }

                for (
                    const permissionId
                    of role.permissionIds
                ) {
                    await assertDelegatedPermission(
                        permissionId,
                        context,
                    );
                }
            }

            return input.useCases.roles.remove.execute({
                ...request,
                removedBy:
                    actorId(context),
            } as Parameters<typeof input.useCases.roles.remove.execute>[0]);
        },

        listRoleAssignments: async (query: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listRoleAssignments",
                context,
                "role-assignment",
            );

            if (
                context.tenant?.tenantType
                === "platform"
            ) {
                const subjectType =
                    query.subjectType as
                    | "identity"
                    | "membership"
                    | undefined;

                const subjectId =
                    query.subjectId as string | undefined;

                const membershipId =
                    query.membershipId as string | undefined
                    ?? (subjectType === "membership" ? subjectId : undefined);

                const identityId =
                    query.identityId as string | undefined
                    ?? (subjectType === "identity" ? subjectId : undefined);

                const assignments =
                    await input.readStore.listRoleAssignments(
                        membershipId,
                        identityId,
                    );

                const expiresBefore =
                    typeof query.expiresBefore === "string"
                        ? Date.parse(query.expiresBefore)
                        : undefined;

                const filtered =
                    assignments
                        .filter(
                            assignment =>
                                query.tenantId === undefined
                                || assignment.tenantId
                                === query.tenantId,
                        )
                        .filter(
                            assignment =>
                                query.roleId === undefined
                                || assignment.roleId
                                === query.roleId,
                        )
                        .filter(
                            assignment =>
                                query.status === undefined
                                || assignment.status
                                === (query.status as "pending" | "active" | "suspended" | "removed" | "expired" | "archived"),
                        )
                        .filter(
                            assignment =>
                                expiresBefore === undefined
                                || (
                                    assignment.expiresAt !== undefined
                                    && Date.parse(
                                        assignment.expiresAt,
                                    ) < expiresBefore
                                ),
                        );

                const offset =
                    typeof query.offset === "number"
                        ? query.offset
                        : 0;

                const limit =
                    typeof query.limit === "number"
                        ? query.limit
                        : filtered.length;

                const items =
                    filtered.slice(
                        offset,
                        offset + limit,
                    );

                return {
                    items,
                    count:
                        items.length,
                    total:
                        filtered.length,
                    limit,
                    offset,
                };
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            const assignments =
                await input.readStore.listRoleAssignments(
                    query.membershipId as string | undefined,
                    query.identityId as string | undefined,
                );

            const items =
                assignments.filter(
                    assignment =>
                        assignment.tenantId
                        === tenantId,
                );

            return { items, count: items.length, limit: query.limit, offset: query.offset };
        },

        grantPermission: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const permissionId =
                String(
                    request.permissionId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "grantPermission",
                context,
                "permission",
                permissionId,
            );

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            const membershipId =
                String(
                    request.membershipId
                    ?? request.subjectId
                    ?? "",
                );

            await assertMembershipInTenant(
                membershipId,
                execution.tenantId,
            );

            await assertDelegatedPermission(
                permissionId,
                context,
            );

            const resource =
                typeof request.resource === "object"
                    && request.resource !== null
                    && !Array.isArray(
                        request.resource,
                    )
                    ? request.resource as Readonly<
                        Record<string, unknown>
                    >
                    : undefined;

            return input.useCases.permissions.grant.execute({
                permissionId,
                membershipId,
                tenantId:
                    execution.tenantId,
                assignmentType:
                    request.effect === "deny"
                        ? "deny"
                        : "grant",
                scope:
                    request.scope === "resource"
                        ? {
                            scopeType:
                                "resource_instance",
                            resourceType:
                                String(
                                    resource?.type
                                    ?? "",
                                ),
                            resourceId:
                                String(
                                    resource?.id
                                    ?? "",
                                ),
                        }
                        : {
                            scopeType:
                                "tenant",
                        },
                assignedBy:
                    actorId(context),
                expiresAt:
                    request.expiresAt,
            } as Parameters<typeof input.useCases.permissions.grant.execute>[0]);
        },

        revokePermission: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const assignmentId =
                String(
                    request.assignmentId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "revokePermission",
                context,
                "permission-assignment",
                assignmentId,
            );

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            const assignment =
                await input.readStore.findPermissionAssignmentById(
                    assignmentId,
                );

            if (
                assignment !== null
                && assignment.tenantId !== execution.tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            if (
                assignment !== null
            ) {
                await assertDelegatedPermission(
                    assignment.permissionId,
                    context,
                );
            }

            return input.useCases.permissions.revoke.execute({
                ...request,
                revokedBy:
                    actorId(context),
            } as Parameters<typeof input.useCases.permissions.revoke.execute>[0]);
        },

        listPermissionAssignments: async (query: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listPermissionAssignments",
                context,
                "permission-assignment",
            );

            if (
                context.tenant?.tenantType
                === "platform"
            ) {
                const subjectType =
                    query.subjectType as
                    | "identity"
                    | "membership"
                    | undefined;

                const subjectId =
                    query.subjectId as string | undefined;

                const membershipId =
                    query.membershipId as string | undefined
                    ?? (subjectType === "membership" ? subjectId : undefined);

                const identityId =
                    query.identityId as string | undefined
                    ?? (subjectType === "identity" ? subjectId : undefined);

                const assignments =
                    await input.readStore.listPermissionAssignments(
                        membershipId,
                        identityId,
                    );

                const expiresBefore =
                    typeof query.expiresBefore === "string"
                        ? Date.parse(query.expiresBefore)
                        : undefined;

                const filtered =
                    assignments
                        .filter(
                            assignment =>
                                query.tenantId === undefined
                                || assignment.tenantId
                                === query.tenantId,
                        )
                        .filter(
                            assignment =>
                                query.permissionId === undefined
                                || assignment.permissionId
                                === query.permissionId,
                        )
                        .filter(
                            assignment =>
                                query.effect === undefined
                                || assignment.assignmentType
                                === (query.effect as "grant" | "deny"),
                        )
                        .filter(
                            assignment =>
                                query.status === undefined
                                || assignment.status
                                === (query.status as "pending" | "active" | "suspended" | "revoked" | "expired" | "archived"),
                        )
                        .filter(
                            assignment =>
                                expiresBefore === undefined
                                || (
                                    assignment.expiresAt !== undefined
                                    && Date.parse(
                                        assignment.expiresAt,
                                    ) < expiresBefore
                                ),
                        );

                const offset =
                    typeof query.offset === "number"
                        ? query.offset
                        : 0;

                const limit =
                    typeof query.limit === "number"
                        ? query.limit
                        : filtered.length;

                const items =
                    filtered.slice(
                        offset,
                        offset + limit,
                    );

                return {
                    items,
                    count:
                        items.length,
                    total:
                        filtered.length,
                    limit,
                    offset,
                };
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            const assignments =
                await input.readStore.listPermissionAssignments(
                    query.membershipId as string | undefined,
                    query.identityId as string | undefined,
                );

            const items =
                assignments.filter(
                    assignment =>
                        assignment.tenantId
                        === tenantId,
                );

            return { items, count: items.length, limit: query.limit, offset: query.offset };
        },

        createPolicy: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "createPolicy",
                context,
                "policy",
            );

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                return input.useCases.policies.create.execute({
                    name:
                        request.name,
                    scope:
                        request.scope,
                    tenantId:
                        request.tenantId,
                    evaluationRules:
                        request,
                    createdBy:
                        actorId(context),
                } as Parameters<typeof input.useCases.policies.create.execute>[0]);
            }

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            if (
                request.scope !== "tenant"
                || (
                    request.tenantId !== undefined
                    && request.tenantId !== execution.tenantId
                )
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            return input.useCases.policies.create.execute({
                name:
                    request.name,
                scope:
                    "tenant",
                tenantId:
                    execution.tenantId,
                evaluationRules:
                    request,
                createdBy:
                    actorId(context),
            } as Parameters<typeof input.useCases.policies.create.execute>[0]);
        },

        updatePolicy: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const policyId =
                String(
                    request.policyId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "updatePolicy",
                context,
                "policy",
                policyId,
            );

            const policy =
                await input.readStore.findPolicyById(
                    policyId,
                );

            if (
                policy !== null
                && !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    policy.scope !== "tenant"
                    || policy.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            return input.useCases.policies.update.execute({
                policyId,
                name:
                    request.name,
                evaluationRules:
                    request,
                updatedBy:
                    actorId(context),
            } as Parameters<typeof input.useCases.policies.update.execute>[0]);
        },

        archivePolicy: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const policyId =
                String(
                    request.policyId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "archivePolicy",
                context,
                "policy",
                policyId,
            );

            const policy =
                await input.readStore.findPolicyById(
                    policyId,
                );

            if (
                policy !== null
                && !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    policy.scope !== "tenant"
                    || policy.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            return input.useCases.policies.archive.execute({
                policyId,
                archivedBy:
                    actorId(context),
            } as Parameters<typeof input.useCases.policies.archive.execute>[0]);
        },

        listPolicies: async (query: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listPolicies",
                context,
                "policy",
            );

            const policies =
                await input.useCases.policies.list.execute(
                    query as Parameters<typeof input.useCases.policies.list.execute>[0],
                );

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                return policies;
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            return policies.filter(
                policy =>
                    policy.tenantId
                    === tenantId,
            );
        },

        createRestriction: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "createRestriction",
                context,
                "restriction",
            );

            const targetType =
                String(
                    request.targetType
                    ?? "",
                );

            const targetId =
                String(
                    request.targetId
                    ?? "",
                );

            const resource =
                typeof request.resource === "object"
                    && request.resource !== null
                    && !Array.isArray(
                        request.resource,
                    )
                    ? request.resource as Readonly<Record<string, unknown>>
                    : undefined;

            const target =
                targetType === "membership"
                    ? {
                        targetType:
                            "membership" as const,
                        membershipId:
                            targetId,
                    }
                    : targetType === "tenant"
                        ? {
                            targetType:
                                "tenant" as const,
                            tenantId:
                                targetId,
                        }
                        : targetType === "role"
                            ? {
                                targetType:
                                    "role" as const,
                                roleId:
                                    targetId,
                            }
                            : targetType === "permission"
                                ? {
                                    targetType:
                                        "permission" as const,
                                    permissionId:
                                        targetId,
                                }
                                : typeof resource?.id === "string"
                                    ? {
                                        targetType:
                                            "resource_instance" as const,
                                        resourceType:
                                            String(
                                                resource.type
                                                ?? targetId,
                                            ),
                                        resourceId:
                                            resource.id,
                                    }
                                    : {
                                        targetType:
                                            "resource_type" as const,
                                        resourceType:
                                            String(
                                                resource?.type
                                                ?? targetId,
                                            ),
                                    };

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                return input.useCases.restrictions.create.execute({
                    target,
                    tenantId:
                        typeof request.tenantId === "string"
                            ? request.tenantId
                            : undefined,
                    restrictionReason:
                        String(
                            request.reasonCode
                            ?? "access_restricted",
                        ),
                    expiresAt:
                        typeof request.expiresAt === "string"
                            ? request.expiresAt
                            : undefined,
                    createdBy:
                        actorId(context),
                });
            }

            const execution =
                requireTenantAdministrativeContext(
                    context,
                );

            if (
                request.tenantId !== undefined
                && request.tenantId !== execution.tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            }

            if (
                target.targetType === "membership"
            ) {
                await assertMembershipInTenant(
                    target.membershipId,
                    execution.tenantId,
                );
            } else if (
                target.targetType === "tenant"
                && target.tenantId !== execution.tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_scope_invalid",
                );
            } else if (
                target.targetType === "role"
            ) {
                const role =
                    await input.readStore.findRoleById(
                        target.roleId,
                    );

                if (
                    role === null
                    || role.roleType !== "tenant"
                    || role.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            return input.useCases.restrictions.create.execute({
                target,
                tenantId:
                    execution.tenantId,
                restrictionReason:
                    String(
                        request.reasonCode
                        ?? "access_restricted",
                    ),
                expiresAt:
                    typeof request.expiresAt === "string"
                        ? request.expiresAt
                        : undefined,
                createdBy:
                    actorId(context),
            });
        },

        removeRestriction: async (request: Record<string, unknown>, context: AccessApiRequestContext) => {
            const restrictionId =
                String(
                    request.restrictionId
                    ?? "",
                );

            await authorizeAdministrativeOperation(
                "removeRestriction",
                context,
                "restriction",
                restrictionId,
            );

            const restriction =
                await input.readStore.findRestrictionById(
                    restrictionId,
                );

            if (
                restriction !== null
                && !isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                const execution =
                    requireTenantAdministrativeContext(
                        context,
                    );

                if (
                    restriction.tenantId !== execution.tenantId
                ) {
                    throw new AccessAdministrativeAuthorizationDeniedError(
                        "authorization_scope_invalid",
                    );
                }
            }

            return input.useCases.restrictions.remove.execute({
                restrictionId,
                removedBy:
                    actorId(context),
            });
        },

        listRestrictions: async (query: Record<string, unknown>, context: AccessApiRequestContext) => {
            await authorizeAdministrativeOperation(
                "listRestrictions",
                context,
                "restriction",
            );

            if (
                isTrustedSecurityFoundationContext(
                    context,
                )
            ) {
                return input.useCases.restrictions.list.execute(
                    query as Parameters<typeof input.useCases.restrictions.list.execute>[0],
                );
            }

            const tenantId =
                requireTenantAdministrativeContext(
                    context,
                ).tenantId;

            return input.useCases.restrictions.list.execute({
                ...(query as Record<string, unknown>),
                tenantId,
            } as Parameters<typeof input.useCases.restrictions.list.execute>[0]);
        },

        authorize: async (
            request: Record<string, unknown>,
            context: AccessApiRequestContext,
        ) => {
            const action =
                typeof request.action === "string"
                    ? request.action.trim()
                    : "";

            const resource =
                typeof request.resource === "object"
                    && request.resource !== null
                    && !Array.isArray(
                        request.resource,
                    )
                    ? request.resource as Readonly<
                        Record<string, unknown>
                    >
                    : undefined;

            const membershipId =
                (
                    context.membershipId
                    ?? ""
                ).trim();

            const tenantId =
                (
                    context.tenant?.tenantId
                    ?? ""
                ).trim();

            const requestedMembershipId =
                typeof request.membershipId === "string"
                    ? request.membershipId.trim()
                    : membershipId;

            const requestedTenantId =
                typeof request.tenantId === "string"
                    ? request.tenantId.trim()
                    : tenantId;

            if (
                requestedMembershipId !== membershipId
                || requestedTenantId !== tenantId
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    "authorization_context_invalid",
                );
            }

            const actionSegments =
                action.split(
                    ".",
                );

            const service =
                actionSegments[0];

            const permissionResource =
                actionSegments.length >= 3
                    ? actionSegments[1]
                    : undefined;

            const permissionAction =
                actionSegments.length >= 3
                    ? actionSegments[2]
                    : actionSegments[1];

            const issues: {
                readonly path: string;
                readonly code: string;
                readonly message: string;
            }[] = [];

            if (
                service === undefined
                || service.length === 0
                || permissionAction === undefined
                || permissionAction.length === 0
            ) {
                issues.push({
                    path:
                        "action",

                    code:
                        "invalid_format",

                    message:
                        "action must identify a service and action.",
                });
            }

            if (
                resource === undefined
            ) {
                issues.push({
                    path:
                        "resource",

                    code:
                        "required",

                    message:
                        "resource is required.",
                });
            }

            const resourceType =
                typeof resource?.type === "string"
                    ? resource.type.trim()
                    : "";

            if (
                resource !== undefined
                && resourceType.length === 0
            ) {
                issues.push({
                    path:
                        "resource.type",

                    code:
                        "required",

                    message:
                        "resource.type is required.",
                });
            }

            if (
                membershipId.length === 0
            ) {
                issues.push({
                    path:
                        "membershipId",

                    code:
                        "required",

                    message:
                        "membershipId is required.",
                });
            }

            if (
                tenantId.length === 0
            ) {
                issues.push({
                    path:
                        "tenantId",

                    code:
                        "required",

                    message:
                        "tenantId is required.",
                });
            }

            if (
                issues.length > 0
            ) {
                throw new AccessValidationHttpError(
                    issues,
                );
            }

            const resourceId =
                typeof resource?.id === "string"
                    ? resource.id.trim()
                    : undefined;

            const authorization =
                await input.useCases.authorization.authorizeAction.execute({
                    identityId:
                        context.actor.actorId,

                    membershipId,

                    tenantId,

                    permission: {
                        service:
                            service!,

                        resource:
                            permissionResource
                            ?? resourceType,

                        action:
                            permissionAction!,
                    },

                    resource: {
                        resourceType,

                        resourceId,
                    },
                });

            return toAuthorizationDecisionDto({
                authorization,

                decisionId:
                    authorization.decisionId,

                actorId:
                    context.actor.actorId,

                action,

                effectivePermissions:
                    authorization.decision === "allow"
                        ? [
                            authorization.permissionKey,
                        ]
                        : [],

                contributingRoleIds:
                    collectAuthorizationEvidenceIds(
                        authorization.evidence,
                        "role_assignment",
                    ),

                contributingPermissionAssignmentIds:
                    collectAuthorizationEvidenceIds(
                        authorization.evidence,
                        "permission_assignment",
                    ),

                evaluatedPolicyIds:
                    collectAuthorizationEvidenceIds(
                        authorization.evidence,
                        "authorization_policy",
                    ),

                appliedRestrictionIds:
                    collectAuthorizationEvidenceIds(
                        authorization.evidence,
                        "access_restriction",
                    ),
            });
        },

    };

    return operations as unknown as CreateAccessApiDependencies;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION EVIDENCE
// -----------------------------------------------------------------------------
// Normalizes evaluator evidence into the stable public Access decision DTO.
//
// The authorization use case owns the canonical evidence. Runtime composition
// only projects identifiers by evidence source and does not reinterpret the
// underlying authorization decision.
// -----------------------------------------------------------------------------

function collectAuthorizationEvidenceIds(
    evidence:
        readonly {
            readonly source:
            string;

            readonly sourceId?:
            string;
        }[],

    source:
        string,
): readonly string[] {
    return [
        ...new Set(
            evidence
                .filter(
                    item =>
                        item.source === source
                        && item.sourceId !== undefined,
                )
                .map(
                    item =>
                        item.sourceId!,
                ),
        ),
    ];
}

// -----------------------------------------------------------------------------
// ROUTE PARAMETER REQUEST COMPOSITION
// -----------------------------------------------------------------------------

/**
 * Adds the trusted Role route identifier to body-shaped validation input.
 *
 * Role application request schemas include roleId, while HTTP provides that
 * identifier through :roleId. The trusted route value must therefore be
 * composed into object-shaped body input before canonical schema validation.
 *
 * Malformed non-object input is deliberately preserved unchanged so the
 * canonical request schema continues to reject invalid transport input.
 */
function composeRouteRequestValue(
    value: unknown,
    parameterName: string,
    parameterValue: string,
): unknown {
    if (
        typeof value !== "object"
        || value === null
        || Array.isArray(
            value,
        )
    ) {
        return value;
    }

    return {
        ...(value as Record<string, unknown>),

        [parameterName]:
            parameterValue,
    };
}

// -----------------------------------------------------------------------------
// API VALIDATION
// -----------------------------------------------------------------------------

function createAccessApiValidation():
    AccessApiValidation {
    const parse = <T>(
        schema:
            AccessRequestSchema<T>,

        value:
            unknown,
    ): T => {
        const result =
            schema.parse(
                value,
            );

        if (
            !result.success
        ) {
            throw new AccessValidationHttpError(
                result.issues,
            );
        }

        return result.value;
    };

    return {
        createPermission:
            value =>
                parse(
                    createPermissionRequestSchema,
                    value,
                ),

        listPermissions:
            value =>
                parse(
                    listPermissionsQuerySchema,
                    value,
                ),

        createRole:
            value =>
                parse(
                    createRoleRequestSchema,
                    value,
                ),

        updateRole:
            (
                value,
                roleId,
            ) =>
                parse(
                    updateRoleRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "roleId",
                        roleId,
                    ),
                ),

        archiveRole:
            (
                value,
                roleId,
            ) =>
                parse(
                    archiveRoleRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "roleId",
                        roleId,
                    ),
                ),

        restoreRole:
            (
                value,
                roleId,
            ) =>
                parse(
                    restoreRoleRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "roleId",
                        roleId,
                    ),
                ),

        listRoles:
            value =>
                parse(
                    listRolesQuerySchema,
                    value,
                ),

        assignRole:
            value =>
                parse(
                    assignRoleRequestSchema,
                    value,
                ),

        removeRole:
            (
                value,
                assignmentId,
            ) =>
                parse(
                    removeRoleRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "assignmentId",
                        assignmentId,
                    ),
                ),

        listRoleAssignments:
            value =>
                parse(
                    listRoleAssignmentsQuerySchema,
                    value,
                ),

        grantPermission:
            value =>
                parse(
                    grantPermissionRequestSchema,
                    value,
                ),

        revokePermission:
            (
                value,
                assignmentId,
            ) =>
                parse(
                    revokePermissionRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "assignmentId",
                        assignmentId,
                    ),
                ),

        listPermissionAssignments:
            value =>
                parse(
                    listPermissionAssignmentsQuerySchema,
                    value,
                ),

        createPolicy:
            value =>
                parse(
                    createPolicyRequestSchema,
                    value,
                ),

        updatePolicy:
            (
                value,
                policyId,
            ) =>
                parse(
                    updatePolicyRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "policyId",
                        policyId,
                    ),
                ),

        archivePolicy:
            (
                value,
                policyId,
            ) =>
                parse(
                    archivePolicyRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "policyId",
                        policyId,
                    ),
                ),

        listPolicies:
            value =>
                parse(
                    listPoliciesQuerySchema,
                    value,
                ),

        createRestriction:
            value =>
                parse(
                    createRestrictionRequestSchema,
                    value,
                ),

        removeRestriction:
            (
                value,
                restrictionId,
            ) =>
                parse(
                    removeRestrictionRequestSchema,
                    composeRouteRequestValue(
                        value,
                        "restrictionId",
                        restrictionId,
                    ),
                ),

        listRestrictions:
            value =>
                parse(
                    listRestrictionsQuerySchema,
                    value,
                ),

        authorize:
            value =>
                parse(
                    authorizeRequestSchema,
                    value,
                ),
    } as AccessApiValidation;
}