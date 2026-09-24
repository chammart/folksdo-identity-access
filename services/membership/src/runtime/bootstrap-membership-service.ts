// services/membership/src/runtime/bootstrap-membership-service.ts
// -----------------------------------------------------------------------------
// BOOTSTRAP MEMBERSHIP SERVICE
// -----------------------------------------------------------------------------
// Service bootstrap entry point for Membership Operations™.
//
// Purpose:
//   • keep the host process thin
//   • receive the shared Folksdo platform runtime
//   • receive the host-composed Membership authorization provider
//   • create Membership-owned runtime dependencies
//   • register Membership-owned reactions and HTTP routes
//
// Membership owns:
//   • Membership collections and indexes
//   • Membership read-store creation
//   • Membership use-case and API composition
//   • Membership invariant enforcement
//   • Membership reaction registration
//   • Membership route registration
//
// Host owns:
//   • process lifecycle
//   • shared platform runtime creation
//   • Membership authorization provider composition
//   • service bootstrap invocation
//
// Notes:
//   • PlatformRuntime is retained until the host runtime contracts are split
//     into stable Engine, Processing, and Mongo public dependency contracts.
//   • HTTP context resolution remains isolated behind the Membership-owned
//     MembershipRouteContextResolver contract.
//   • Administrative authorization is supplied through the Membership-owned
//     provider-neutral MembershipAccessAuthorizer contract.
//   • Membership-owned workers execute as trusted system actors and do not
//     receive administrative permission grants through RuntimeContext.
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    PlatformRuntime,
} from "@folksdo-platform/runtime";

import type {
    FastifyInstance,
} from "fastify";

import type {
    MembershipAccessAuthorizer,
} from "../authorization";

import {
    registerMembershipRoutes,
    type MembershipProviderReadSecurityResolver,
    type MembershipRouteContextResolver,
} from "../api";

import {
    createMongoMembershipReadStore,
    ensureMembershipIndexes,
    type MembershipCollections,
} from "../read-store";

import {
    isPermanentMembershipReactionFailure,
    membershipReactionSubjects,
    MembershipReactionPayloadError,
    type MembershipInboundEvent,
    type MembershipReactionSubject,
} from "../reactions";

import type {
    MembershipIdGenerator,
    MembershipOutboxSubjects,
} from "../usecases";

import {
    createMembershipRuntime,
} from "./create-membership-runtime";

import type {
    MembershipRuntime,
} from "./membership-runtime";

import type {
    MembershipServiceConfig,
} from "./membership-service-config";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface BootstrapMembershipServiceInput {
    readonly app:
    FastifyInstance;

    readonly platformRuntime:
    PlatformRuntime;

    readonly config:
    MembershipServiceConfig;

    readonly contextResolver:
    MembershipRouteContextResolver;

    /**
     * Provider-neutral administrative authorization boundary supplied by the
     * host.
     *
     * Membership owns this contract but does not construct the authorization
     * provider. In Folksdo Operations™, the host binds this boundary to Access
     * Operations™.
     */
    readonly accessAuthorizer:
    MembershipAccessAuthorizer;
}

// -----------------------------------------------------------------------------
// BOOTSTRAP
// -----------------------------------------------------------------------------

export async function bootstrapMembershipService(
    input: BootstrapMembershipServiceInput,
): Promise<MembershipRuntime> {
    const collections =
        createMembershipCollections();

    const outboxSubjects =
        createMembershipOutboxSubjects();

    await ensureMembershipIndexes({
        database:
            input.platformRuntime.mongo.database,

        collections,
    });

    const readStore =
        createMongoMembershipReadStore({
            database:
                input.platformRuntime.mongo.database,

            collections,
        });

    const runtime =
        createMembershipRuntime({
            engine:
                input.platformRuntime.engine.engine,

            clock:
                createSystemClock(),

            ids:
                createMembershipIds(),

            readStore,

            collections,

            outboxSubjects,

            accessAuthorizer:
                input.accessAuthorizer,

            defaultInvitationTtlMilliseconds:
                input.config.invitationTtlMilliseconds,

            invitationExpirationBatchSize:
                input.config.invitationExpirationBatchSize,
        });

    registerMembershipReactions({
        platformRuntime:
            input.platformRuntime,

        membershipRuntime:
            runtime,
    });

    registerInvitationExpirationSchedule({
        app:
            input.app,

        runtime,

        intervalMilliseconds:
            input.config.invitationExpirationIntervalMilliseconds
            ?? 60_000,
    });

    await registerMembershipRoutes({
        app:
            input.app,

        membershipApi:
            runtime.api,

        contextResolver:
            input.contextResolver,

        providerReadSecurityResolver:
            createProviderReadSecurityResolver(
                input.contextResolver,
                runtime,
            ),
    });

    return runtime;
}


function createProviderReadSecurityResolver(
    contextResolver: MembershipRouteContextResolver,
    runtime: MembershipRuntime,
): MembershipProviderReadSecurityResolver {
    return {
        async resolvePlatform(resolverInput) {
            const context =
                await contextResolver.resolve(
                    resolverInput,
                );

            const membershipContext =
                await runtime.api.getCurrentContext(
                    context.actor.actorId,
                    context,
                );

            return {
                context,
                security: {
                    scope: {
                        type: "platform",
                        tenantId:
                            membershipContext.activeTenantId,
                        membershipId:
                            membershipContext.activeMembershipId,
                    },
                },
            };
        },
    };
}

// -----------------------------------------------------------------------------
// DEFAULT MEMBERSHIP RUNTIME DEPENDENCIES
// -----------------------------------------------------------------------------
// These defaults are Membership-owned runtime choices.
// They remain inside the service bootstrap so the host stays thin.
// -----------------------------------------------------------------------------

function createMembershipCollections(): MembershipCollections {
    return {
        memberships:
            "membership_memberships",

        invitations:
            "membership_invitations",

        contexts:
            "membership_contexts",
    };
}

function createMembershipOutboxSubjects(): MembershipOutboxSubjects {
    return {
        membershipCreated:
            "membership.membership.created",

        membershipActivated:
            "membership.membership.activated",

        membershipSuspended:
            "membership.membership.suspended",

        membershipReactivated:
            "membership.membership.reactivated",

        membershipArchived:
            "membership.membership.archived",

        invitationCreated:
            "membership.invitation.created",

        invitationRedeemed:
            "membership.invitation.redeemed",

        invitationRevoked:
            "membership.invitation.revoked",

        invitationExpired:
            "membership.invitation.expired",

        contextChanged:
            "membership.context.changed",

        contextCleared:
            "membership.context.cleared",
    };
}

function createMembershipIds(): MembershipIdGenerator {
    return {
        createMembershipId(): string {
            return `membership_${randomUUID()}`;
        },

        createInvitationId(): string {
            return `invitation_${randomUUID()}`;
        },

        createEventId(): string {
            return `event_${randomUUID()}`;
        },

        createOutboxMessageId(): string {
            return `outbox_${randomUUID()}`;
        },
    };
}

function createSystemClock(): Clock {
    return {
        now(): Date {
            return new Date();
        },

        nowTimestamp(): string {
            return new Date().toISOString();
        },
    };
}

// -----------------------------------------------------------------------------
// REACTION REGISTRATION
// -----------------------------------------------------------------------------

interface RegisterMembershipReactionsInput {
    readonly platformRuntime:
    PlatformRuntime;

    readonly membershipRuntime:
    MembershipRuntime;
}

function registerMembershipReactions(
    input: RegisterMembershipReactionsInput,
): void {
    input.platformRuntime.processing.processing.reactions.register({
        reactionName:
            "membership.lifecycle-events",

        subjects: [
            ...membershipReactionSubjects,
        ],

        async handler({
            message,
        }): Promise<void> {
            const payload =
                readPayloadRecord(
                    message.payload,
                );

            const context =
                input.platformRuntime.engine.engine.context.create({
                    requestId:
                        readOptionalString(
                            payload,
                            "requestId",
                        )
                        ?? `reaction_${randomUUID()}`,

                    correlationId:
                        readOptionalString(
                            payload,
                            "correlationId",
                        ),

                    causationId:
                        readOptionalString(
                            payload,
                            "eventId",
                        )
                        ?? readOptionalString(
                            payload,
                            "causationId",
                        ),

                    actor: {
                        actorId:
                            readOptionalString(
                                payload,
                                "actorId",
                            )
                            ?? "membership-reaction",

                        actorType:
                            "service",
                    },

                    tenant: {
                        tenantId:
                            readOptionalString(
                                payload,
                                "tenantId",
                            )
                            ?? readOptionalString(
                                payload,
                                "targetTenantId",
                            )
                            ?? "global",

                        tenantType:
                            "customer",
                    },

                    permissions: [],
                });

            try {
                await input.membershipRuntime.reactions.handle(
                    parseMembershipInboundEvent(
                        message.subject,
                        payload,
                    ),
                    context,
                );
            } catch (error) {
                if (
                    isPermanentMembershipReactionFailure(
                        error,
                    )
                ) {
                    return;
                }

                throw error;
            }
        },
    });
}

// -----------------------------------------------------------------------------
// EVENT TRANSLATION
// -----------------------------------------------------------------------------

function parseMembershipInboundEvent(
    subject: string,
    payload: Record<string, unknown>,
): MembershipInboundEvent {
    if (!isMembershipReactionSubject(subject)) {
        throw new MembershipReactionPayloadError(
            `Unsupported Membership reaction subject: ${subject}.`,
        );
    }

    switch (subject) {
        case "identity.invitation_redemption.requested":
            return {
                eventType:
                    subject,

                payload: {
                    invitationId:
                        readRequiredString(
                            payload,
                            "invitationId",
                        ),

                    userId:
                        readRequiredString(
                            payload,
                            "userId",
                        ),

                    email:
                        readRequiredString(
                            payload,
                            "email",
                        ),
                },
            };

        case "identity.user.activated":
            return {
                eventType:
                    subject,

                payload: {
                    userId:
                        readRequiredString(
                            payload,
                            "userId",
                        ),
                },
            };

        case "identity.identity.archived":
            return {
                eventType:
                    subject,

                payload: {
                    identityId:
                        readRequiredString(
                            payload,
                            "identityId",
                        ),

                    reason:
                        readOptionalString(
                            payload,
                            "reason",
                        ),
                },
            };

        case "tenant.suspended":
        case "tenant.archived":
            return {
                eventType:
                    subject,

                payload: {
                    tenantId:
                        readRequiredString(
                            payload,
                            "tenantId",
                        ),

                    reason:
                        readOptionalString(
                            payload,
                            "reason",
                        ),
                },
            };

        case "subscription.suspended":
        case "subscription.reactivated":
            return {
                eventType:
                    subject,

                payload: {
                    subscriptionId:
                        readRequiredString(
                            payload,
                            "subscriptionId",
                        ),

                    tenantId:
                        readRequiredString(
                            payload,
                            "tenantId",
                        ),

                    reason:
                        readOptionalString(
                            payload,
                            "reason",
                        ),
                },
            };
    }
}

function isMembershipReactionSubject(
    subject: string,
): subject is MembershipReactionSubject {
    return membershipReactionSubjects.includes(
        subject as MembershipReactionSubject,
    );
}

// -----------------------------------------------------------------------------
// PAYLOAD VALIDATION
// -----------------------------------------------------------------------------

function readPayloadRecord(
    payload: unknown,
): Record<string, unknown> {
    if (
        typeof payload !== "object"
        || payload === null
        || Array.isArray(payload)
    ) {
        throw new MembershipReactionPayloadError(
            "Membership reaction payload must be an object.",
        );
    }

    return payload as Record<string, unknown>;
}

function readRequiredString(
    payload: Record<string, unknown>,
    field: string,
): string {
    const value =
        payload[field];

    if (
        typeof value !== "string"
        || value.trim().length === 0
    ) {
        throw new MembershipReactionPayloadError(
            `Membership reaction payload is missing ${field}.`,
        );
    }

    return value.trim();
}

function readOptionalString(
    payload: Record<string, unknown>,
    field: string,
): string | undefined {
    const value =
        payload[field];

    if (
        typeof value !== "string"
        || value.trim().length === 0
    ) {
        return undefined;
    }

    return value.trim();
}

// -----------------------------------------------------------------------------
// INVITATION EXPIRATION SCHEDULE
// -----------------------------------------------------------------------------
// Automatic invitation expiration is a trusted Membership-owned system path.
//
// It does not represent a human administrative request and therefore does not
// receive Membership administrative permission grants or route through the
// Membership Access authorization boundary.
// -----------------------------------------------------------------------------

function registerInvitationExpirationSchedule(
    input: {
        readonly app:
        FastifyInstance;

        readonly runtime:
        MembershipRuntime;

        readonly intervalMilliseconds:
        number;
    },
): void {
    if (
        input.intervalMilliseconds
        <= 0
    ) {
        return;
    }

    const run =
        async (): Promise<void> => {
            const executionId =
                randomUUID();

            await input.runtime.invitationExpirationWorker.runOnce({
                requestId:
                    `membership-expiration-${executionId}`,

                correlationId:
                    executionId,

                causationId:
                    executionId,

                actor: {
                    actorId:
                        "membership-expiration-worker",

                    actorType:
                        "worker",
                },

                tenant: {
                    tenantId:
                        "folksdo-control-plane",

                    tenantType:
                        "provider",
                },

                permissions: [],
            });
        };

    const timer =
        setInterval(
            () => {
                void run();
            },
            input.intervalMilliseconds,
        );

    timer.unref();

    input.app.addHook(
        "onClose",
        async () => {
            clearInterval(
                timer,
            );
        },
    );
}