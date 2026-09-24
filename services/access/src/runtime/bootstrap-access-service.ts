// services/access/src/runtime/bootstrap-access-service.ts
// -----------------------------------------------------------------------------
// BOOTSTRAP ACCESS SERVICE
// -----------------------------------------------------------------------------
// Access Operations™ production composition root.
//
// Purpose:
//   • keep the application host thin
//   • receive the shared Folksdo platform runtime
//   • create Access-owned persistence and application components
//   • ensure Access indexes before route registration
//   • register Access-owned inbound business-event reactions
//   • register Access-owned HTTP routes
//   • return the lifecycle-aware Access runtime
//
// Host owns:
//   • process lifecycle
//   • shared platform runtime creation
//   • service bootstrap invocation
//
// Access owns:
//   • collection names and indexes
//   • read-store and use-case composition
//   • API and route composition
//   • reaction registration and dispatch
//   • worker lifecycle
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

import type {
    PlatformRuntime,
} from "@folksdo-platform/runtime";

import type {
    FastifyInstance,
} from "fastify";

import type {
    AccessApiRequestContextResolver,
} from "../api";

import type {
    MongoAccessCollectionNames,
} from "../read-store";

import type {
    AccessReactionEventMetadata,
} from "../reactions";

import type {
    AccessIdGenerator,
    AccessOutboxSubjects,
} from "../usecases";

import {
    composeAccessServiceComponents,
} from "./composition";

import {
    ensureAccessRuntimeIndexes,
} from "./indexes";

import {
    createAccessRuntime,
} from "./create-access-runtime";

import type {
    AccessRuntime,
} from "./access-runtime-contracts";

import type {
    AccessServiceConfig,
} from "./access-service-config";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface BootstrapAccessServiceInput {
    readonly app:
    FastifyInstance;

    readonly platformRuntime:
    PlatformRuntime;

    readonly config:
    AccessServiceConfig;

    readonly contextResolver:
    AccessApiRequestContextResolver;
}

// -----------------------------------------------------------------------------
// BOOTSTRAP
// -----------------------------------------------------------------------------

export async function bootstrapAccessService(
    input:
        BootstrapAccessServiceInput,
): Promise<AccessRuntime> {
    const collections =
        createAccessCollections();

    await ensureAccessRuntimeIndexes({
        database:
            input.platformRuntime.mongo.database,

        collections: {
            permissions:
                collections.permissions,

            roles:
                collections.roles,

            roleAssignments:
                collections.roleAssignments,

            permissionAssignments:
                collections.permissionAssignments,

            authorizationPolicies:
                collections.policies,

            accessRestrictions:
                collections.restrictions,

            knownIdentities:
                collections.knownIdentities,

            knownMemberships:
                collections.knownMemberships,

            knownTenants:
                collections.knownTenants,

            knownSubscriptionCapabilities:
                collections.knownSubscriptionCapabilities,
        },
    });

    const runtime =
        createAccessRuntime({
            components:
                composeAccessServiceComponents({
                    database:
                        input.platformRuntime.mongo.database,

                    engine:
                        input.platformRuntime.engine.engine,

                    collections,

                    clock:
                        createAccessClock(),

                    ids:
                        createAccessIds(),

                    outboxSubjects:
                        createAccessOutboxSubjects(),

                    contextResolver:
                        input.contextResolver,
                }),

            config:
                input.config,
        });

    registerAccessReactions({
        platformRuntime:
            input.platformRuntime,

        accessRuntime:
            runtime,
    });

    await runtime.registerRoutes(
        input.app,
    );

    return runtime;
}

// -----------------------------------------------------------------------------
// ACCESS REACTION REGISTRATION
// -----------------------------------------------------------------------------
// Connects the provider-neutral Access reaction dispatcher to Folksdo
// Processing.
//
// Processing owns:
//   • broker subscription
//   • delivery
//   • acknowledgment
//   • retry
//   • dead-letter behavior
//
// Access owns:
//   • supported business subjects
//   • source-event validation
//   • use-case invocation
//   • canonical authorization state changes
// -----------------------------------------------------------------------------

interface RegisterAccessReactionsInput {
    readonly platformRuntime:
    PlatformRuntime;

    readonly accessRuntime:
    AccessRuntime;
}

function registerAccessReactions(
    input:
        RegisterAccessReactionsInput,
): void {
    input.platformRuntime
        .processing
        .processing
        .reactions
        .register({
            reactionName:
                "access.lifecycle-events",

            subjects: [
                ...input
                    .accessRuntime
                    .components
                    .reactions
                    .subjects,
            ],

            async handler({
                message,
            }): Promise<void> {
                const payload =
                    readAccessReactionPayload(
                        message.payload,
                    );

                const metadata =
                    createAccessReactionMetadata({
                        subject:
                            message.subject,

                        payload,

                        receivedAt:
                            message.receivedAt,
                    });

                await input
                    .accessRuntime
                    .components
                    .reactions
                    .handle({
                        metadata,

                        payload,
                    });
            },
        });
}

// -----------------------------------------------------------------------------
// ACCESS REACTION METADATA
// -----------------------------------------------------------------------------

interface CreateAccessReactionMetadataInput {
    readonly subject:
    string;

    readonly payload:
    Readonly<Record<string, unknown>>;

    readonly receivedAt:
    string;
}

function createAccessReactionMetadata(
    input:
        CreateAccessReactionMetadataInput,
): AccessReactionEventMetadata {
    const eventId =
        readOptionalString(
            input.payload,
            "eventId",
        )
        ?? readOptionalString(
            input.payload,
            "sourceEventId",
        )
        ?? readOptionalString(
            input.payload,
            "outboxMessageId",
        )
        ?? `access-reaction-${randomUUID()}`;

    return {
        eventId,

        subject:
            input.subject,

        source:
            resolveAccessReactionSource(
                input.subject,
            ),

        version:
            readOptionalPositiveInteger(
                input.payload,
                "version",
            )
            ?? 1,

        occurredAt:
            readOptionalString(
                input.payload,
                "occurredAt",
            )
            ?? input.receivedAt,

        requestId:
            readOptionalString(
                input.payload,
                "requestId",
            ),

        correlationId:
            readOptionalString(
                input.payload,
                "correlationId",
            ),

        causationId:
            readOptionalString(
                input.payload,
                "causationId",
            )
            ?? readOptionalString(
                input.payload,
                "eventId",
            ),
    };
}

function resolveAccessReactionSource(
    subject: string,
): string {
    const separatorIndex =
        subject.indexOf(
            ".",
        );

    if (
        separatorIndex <= 0
    ) {
        return subject;
    }

    return subject.slice(
        0,
        separatorIndex,
    );
}

// -----------------------------------------------------------------------------
// ACCESS REACTION PAYLOAD VALIDATION
// -----------------------------------------------------------------------------

function readAccessReactionPayload(
    payload: unknown,
): Readonly<Record<string, unknown>> {
    if (
        typeof payload !== "object"
        || payload === null
        || Array.isArray(
            payload,
        )
    ) {
        throw new Error(
            "Access reaction payload must be an object.",
        );
    }

    return payload as Readonly<Record<string, unknown>>;
}

function readOptionalString(
    payload:
        Readonly<Record<string, unknown>>,

    field:
        string,
): string | undefined {
    const value =
        payload[
        field
        ];

    if (
        typeof value !== "string"
        || value.trim().length === 0
    ) {
        return undefined;
    }

    return value.trim();
}

function readOptionalPositiveInteger(
    payload:
        Readonly<Record<string, unknown>>,

    field:
        string,
): number | undefined {
    const value =
        payload[
        field
        ];

    if (
        typeof value !== "number"
        || !Number.isInteger(
            value,
        )
        || value <= 0
    ) {
        return undefined;
    }

    return value;
}

// -----------------------------------------------------------------------------
// ACCESS COLLECTIONS
// -----------------------------------------------------------------------------

function createAccessCollections():
    MongoAccessCollectionNames {
    return {
        permissions:
            "access_permissions",

        roles:
            "access_roles",

        roleAssignments:
            "access_role_assignments",

        permissionAssignments:
            "access_permission_assignments",

        policies:
            "access_authorization_policies",

        restrictions:
            "access_restrictions",

        knownMemberships:
            "access_known_memberships",

        knownTenants:
            "access_known_tenants",

        knownIdentities:
            "access_known_identities",

        knownSubscriptionCapabilities:
            "access_known_subscription_capabilities",
    };
}

// -----------------------------------------------------------------------------
// ACCESS CLOCK
// -----------------------------------------------------------------------------

function createAccessClock() {
    return {
        now(): string {
            return new Date().toISOString();
        },
    };
}

// -----------------------------------------------------------------------------
// ACCESS IDENTIFIERS
// -----------------------------------------------------------------------------

function createAccessIds():
    AccessIdGenerator {
    return {
        roleId: () =>
            `role_${randomUUID()}`,

        permissionId: () =>
            `permission_${randomUUID()}`,

        assignmentId: () =>
            `assignment_${randomUUID()}`,

        policyId: () =>
            `policy_${randomUUID()}`,

        restrictionId: () =>
            `restriction_${randomUUID()}`,

        authorizationDecisionId: () =>
            `access_decision_${randomUUID()}`,

        eventId: () =>
            `event_${randomUUID()}`,

        outboxMessageId: () =>
            `outbox_${randomUUID()}`,
    };
}

// -----------------------------------------------------------------------------
// ACCESS OUTBOX SUBJECTS
// -----------------------------------------------------------------------------

function createAccessOutboxSubjects():
    AccessOutboxSubjects {
    return {
        permissionCreated:
            "access.permission.created",

        roleCreated:
            "access.role.created",

        roleUpdated:
            "access.role.updated",

        roleArchived:
            "access.role.archived",

        roleRestored:
            "access.role.restored",

        roleAssigned:
            "access.role.assigned",

        roleRemoved:
            "access.role.removed",

        permissionGranted:
            "access.permission.granted",

        permissionRevoked:
            "access.permission.revoked",

        policyCreated:
            "access.policy.created",

        policyUpdated:
            "access.policy.updated",

        policyArchived:
            "access.policy.archived",

        restrictionCreated:
            "access.restriction.created",

        restrictionRemoved:
            "access.restriction.removed",

        assignmentExpired:
            "access.assignment.expired",

        restrictionExpired:
            "access.restriction.expired",

        authorizationEvaluated:
            "access.authorization.evaluated",

        membershipAuthorizationRecorded:
            "access.membership.authorization.recorded",

        membershipAuthorizationActivated:
            "access.membership.authorization.activated",

        membershipAuthorizationSuspended:
            "access.membership.authorization.suspended",

        membershipAuthorizationArchived:
            "access.membership.authorization.archived",

        membershipAuthorizationReactivated:
            "access.membership.authorization.reactivated",

        tenantAuthorizationProvisioned:
            "access.tenant.authorization.provisioned",

        tenantAuthorizationActivated:
            "access.tenant.authorization.activated",

        tenantAuthorizationSuspended:
            "access.tenant.authorization.suspended",

        tenantAuthorizationReactivated:
            "access.tenant.authorization.reactivated",

        tenantAuthorizationArchived:
            "access.tenant.authorization.archived",

        subscriptionCapabilitiesApplied:
            "access.subscription.capabilities.applied",

        securityPolicyApplied:
            "access.security.policy.applied",

        identityAccessActivated:
            "access.identity.authorization.activated",

        identityAccessSuspended:
            "access.identity.suspended",

        identityAccessArchived:
            "access.identity.archived",

        identityAccessRestored:
            "access.identity.restored",
    };
}