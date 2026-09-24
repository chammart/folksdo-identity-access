// services/identity/src/runtime/bootstrap-identity-service.ts
// -----------------------------------------------------------------------------
// BOOTSTRAP IDENTITY SERVICE
// -----------------------------------------------------------------------------
// Service bootstrap entry point for Identity Service™.
//
// The host owns process lifecycle and authenticated transport composition.
// Identity owns BetterAuth, persistence, use cases, reactions, API, and routes.
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

import {
    createIdentityAcceptanceCaptureSenders,
} from "../acceptance";

import {
    createBetterAuthIdentityAdapter,
    createBetterAuthRuntime,
    type SendBetterAuthResetPassword,
    type SendBetterAuthVerificationEmail,
} from "../adapters";

import {
    registerIdentityRoutes,
    type IdentityAuthenticatedRouteContextResolver,
    type IdentityProviderReadSecurityResolver,
    type IdentityRouteContextResolver,
} from "../api";

import type { IdentityAccessAuthorizer } from "../authorization";

import {
    createLocalInvitationVerifier,
    createMongoKnownInvitationReadStore,
    ensureKnownInvitationIndexes,
} from "../known-invitations";

import {
    createMongoIdentityReadStore,
    ensureIdentityReadStoreIndexes,
} from "../read-store";

import type {
    IdentityCollections,
    IdentityIdGenerator,
    IdentityOutboxSubjects,
} from "../usecases";

import {
    createIdentityRuntime,
} from "./create-identity-runtime";

import type {
    IdentityServiceConfig,
} from "./identity-service-config";

import type {
    IdentityRuntime,
} from "./identity-runtime";

import {
    registerIdentityReactions,
} from "./register-identity-reactions";

export interface BootstrapIdentityServiceInput {
    readonly app:
    FastifyInstance;

    readonly platformRuntime:
    PlatformRuntime;

    readonly config:
    IdentityServiceConfig;

    readonly authenticatedContextResolver:
    IdentityAuthenticatedRouteContextResolver;

    readonly providerReadSecurityResolver:
    IdentityProviderReadSecurityResolver;

    readonly accessAuthorizer:
    IdentityAccessAuthorizer;
}

export async function bootstrapIdentityService(
    input:
        BootstrapIdentityServiceInput,
): Promise<IdentityRuntime> {
    const collections =
        createIdentityCollections();

    const outboxSubjects =
        createIdentityOutboxSubjects();

    await ensureIdentityReadStoreIndexes({
        database:
            input.platformRuntime.mongo.database,

        collections: {
            users:
                collections.users,

            credentials:
                collections.credentials,

            emailVerifications:
                collections.emailVerifications,

            sessions:
                collections.sessions,
        },
    });

    await ensureKnownInvitationIndexes({
        database:
            input.platformRuntime.mongo.database,

        collectionName:
            collections.knownInvitations,
    });

    const knownInvitationReadStore =
        createMongoKnownInvitationReadStore({
            database:
                input.platformRuntime.mongo.database,

            collectionName:
                collections.knownInvitations,
        });

    const acceptanceCaptureSenders =
        input.config.acceptanceCaptureEnabled
            ? createIdentityAcceptanceCaptureSenders({
                database:
                    input.platformRuntime.mongo.database,

                collectionName:
                    input.config.acceptanceCapturesCollectionName,
            })
            : undefined;

    const betterAuthRuntime =
        createBetterAuthRuntime({
            database:
                input.platformRuntime.mongo.database,

            baseUrl:
                input.config.betterAuthBaseUrl,

            trustedOrigins:
                input.config.betterAuthTrustedOrigins,

            secret:
                input.config.betterAuthSecret,

            sendVerificationEmail:
                acceptanceCaptureSenders?.verification
                ?? createVerificationEmailSender(),

            sendResetPassword:
                acceptanceCaptureSenders?.passwordReset
                ?? createResetPasswordSender(),
        });

    const identityReadStore =
        createMongoIdentityReadStore({
            database:
                input.platformRuntime.mongo.database,

            collections: {
                users:
                    collections.users,

                credentials:
                    collections.credentials,

                emailVerifications:
                    collections.emailVerifications,

                sessions:
                    collections.sessions,
            },
        });

    const runtime =
        createIdentityRuntime({
            engine:
                input.platformRuntime.engine.engine,

            clock:
                createSystemClock(),

            ids:
                createIdentityIds(),

            readStore:
                identityReadStore,

            credentialReadStore:
                identityReadStore,

            knownInvitationReadStore,

            invitationVerifier:
                createLocalInvitationVerifier({
                    readStore:
                        knownInvitationReadStore,
                }),

            betterAuth:
                createBetterAuthIdentityAdapter({
                    auth:
                        betterAuthRuntime,
                }),

            collections,

            outboxSubjects,

            invitationSignUpSessionTtlMilliseconds:
                input.config.invitationSignUpSessionTtlMilliseconds,

            signInSessionTtlMilliseconds:
                input.config.signInSessionTtlMilliseconds,

            emailVerificationTtlMilliseconds:
                input.config.emailVerificationTtlMilliseconds,

            accessAuthorizer:
                input.accessAuthorizer,
        });

    registerIdentityReactions({
        platformRuntime:
            input.platformRuntime,

        identityRuntime:
            runtime,
    });

    await registerIdentityRoutes({
        app:
            input.app,

        identityApi:
            runtime.api,

        contextResolver:
            createAnonymousContextResolver(
                input.platformRuntime.engine.engine,
            ),

        authenticatedContextResolver:
            input.authenticatedContextResolver,

        providerReadSecurityResolver:
            input.providerReadSecurityResolver,
    });

    return runtime;
}

function createIdentityCollections(): IdentityCollections {
    return {
        users:
            "identity_users",

        userProfiles:
            "identity_user_profiles",

        credentials:
            "identity_credentials",

        sessions:
            "identity_sessions",

        emailVerifications:
            "identity_email_verifications",

        knownInvitations:
            "identity_known_invitations",
    };
}

function createIdentityOutboxSubjects(): IdentityOutboxSubjects {
    return {
        emailVerificationRequested:
            "identity.email_verification.requested",

        invitationRedemptionRequested:
            "identity.invitation_redemption.requested",

        userEmailVerified:
            "identity.user_email_verified",

        userActivated:
            "identity.user.activated",

        sessionCreated:
            "identity.session_created",

        sessionEnded:
            "identity.session_ended",

        passwordResetRequested:
            "identity.password_reset_requested",

        credentialUpdated:
            "identity.credential_updated",
    };
}

function createIdentityIds(): IdentityIdGenerator {
    return {
        createUserId(): string {
            return `user_${randomUUID()}`;
        },

        createUserProfileId(): string {
            return `profile_${randomUUID()}`;
        },

        createCredentialId(): string {
            return `credential_${randomUUID()}`;
        },

        createSessionId(): string {
            return `session_${randomUUID()}`;
        },

        createEmailVerificationId(): string {
            return `email_verification_${randomUUID()}`;
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
            return new Date()
                .toISOString();
        },
    };
}

function createVerificationEmailSender():
    SendBetterAuthVerificationEmail {
    return {
        async send(): Promise<void> {
            return;
        },
    };
}

function createResetPasswordSender():
    SendBetterAuthResetPassword {
    return {
        async send(): Promise<void> {
            return;
        },
    };
}

function createAnonymousContextResolver(
    engine:
        PlatformRuntime["engine"]["engine"],
): IdentityRouteContextResolver {
    return {
        async resolve(
            resolverInput,
        ): Promise<ReturnType<typeof engine.context.create>> {
            return engine.context.create({
                requestId:
                    typeof resolverInput.request.id ===
                        "string"
                        && resolverInput.request.id.trim().length >
                        0
                        ? resolverInput.request.id.trim()
                        : `request_${randomUUID()}`,

                actor: {
                    actorId:
                        "anonymous",

                    actorType:
                        "anonymous",
                },

                tenant: {
                    tenantId:
                        "folksdo-control-plane",

                    tenantType:
                        "provider",
                },

                permissions:
                    [],
            });
        },
    };
}
