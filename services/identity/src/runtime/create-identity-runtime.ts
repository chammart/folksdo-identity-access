// services/identity/src/runtime/create-identity-runtime.ts
// -----------------------------------------------------------------------------
// CREATE IDENTITY RUNTIME
// -----------------------------------------------------------------------------
// Internal runtime composition for Identity Service™.
//
// Purpose:
//   • compose use cases
//   • compose IdentityApi
//   • compose Identity reactions
//   • keep Identity wiring inside the service boundary
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
} from "@folksdo-engine/runtime";

import type {
    BetterAuthIdentityAdapter,
} from "../adapters";

import { createIdentityAuthorization, type IdentityAccessAuthorizer } from "../authorization";

import type {
    KnownInvitationReadStore,
} from "../known-invitations";

import type {
    IdentityCredentialReadStore,
    IdentityPasswordResetSessionReadStore,
    IdentityReadStore,
} from "../read-store";

import {
    createExpireKnownInvitationReaction,
    createIdentityReactionDispatcher,
    createMarkKnownInvitationRedeemedReaction,
    createRecordKnownInvitationReaction,
    createRevokeKnownInvitationReaction,
} from "../reactions";

import {
    createChangePasswordUseCase,
    createCurrentSessionUseCase,
    createCurrentUserUseCase,
    createInvitationSignUpUseCase,
    createRequestPasswordResetUseCase,
    createResetPasswordUseCase,
    createSignInUseCase,
    createSignOutUseCase,
    createVerifyEmailUseCase,
    createGetIdentityForProviderUseCase,
    createListIdentitiesForProviderUseCase,
    type IdentityCollections,
    type IdentityIdGenerator,
    type IdentityOutboxSubjects,
    type InvitationVerifier,
} from "../usecases";

import {
    createIdentityApi,
} from "./create-identity-api";

import type {
    IdentityRuntime,
} from "./identity-runtime";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateIdentityRuntimeInput {
    readonly engine:
    Pick<
        FolksdoEngine,
        "state"
    >;

    readonly clock:
    Clock;

    readonly ids:
    IdentityIdGenerator;

    readonly readStore:
    IdentityReadStore
    & IdentityPasswordResetSessionReadStore;

    readonly credentialReadStore:
    IdentityCredentialReadStore;

    readonly knownInvitationReadStore:
    KnownInvitationReadStore;

    readonly invitationVerifier:
    InvitationVerifier;

    readonly betterAuth:
    BetterAuthIdentityAdapter;

    readonly collections:
    IdentityCollections;

    readonly outboxSubjects:
    IdentityOutboxSubjects;

    readonly invitationSignUpSessionTtlMilliseconds:
    number;

    readonly signInSessionTtlMilliseconds:
    number;

    readonly emailVerificationTtlMilliseconds:
    number;

    readonly accessAuthorizer?:
    IdentityAccessAuthorizer;
}
// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createIdentityRuntime(
    input:
        CreateIdentityRuntimeInput,
): IdentityRuntime {
    const authorization =
        createIdentityAuthorization(
            input.accessAuthorizer
            ?? {
                async authorize() {
                    throw new Error(
                        "Identity provider-read Access authorizer is not configured.",
                    );
                },
            },
        );

    const invitationSignUpUseCase =
        createInvitationSignUpUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            invitationVerifier:
                input.invitationVerifier,

            betterAuth:
                input.betterAuth,

            collections:
                input.collections,

            outboxSubjects:
                input.outboxSubjects,

            sessionTtlMilliseconds:
                input.invitationSignUpSessionTtlMilliseconds,

            emailVerificationTtlMilliseconds:
                input.emailVerificationTtlMilliseconds,
        });

    const signInUseCase =
        createSignInUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            betterAuth:
                input.betterAuth,

            collections: {
                sessions:
                    input.collections.sessions,
            },

            outboxSubjects: {
                sessionCreated:
                    input.outboxSubjects.sessionCreated,
            },

            sessionTtlMilliseconds:
                input.signInSessionTtlMilliseconds,
        });

    const signOutUseCase =
        createSignOutUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            betterAuth:
                input.betterAuth,

            collections: {
                sessions:
                    input.collections.sessions,
            },

            outboxSubjects: {
                sessionEnded:
                    input.outboxSubjects.sessionEnded,
            },
        });

    const currentSessionUseCase =
        createCurrentSessionUseCase({
            clock:
                input.clock,

            readStore:
                input.readStore,
        });

    const currentUserUseCase =
        createCurrentUserUseCase({
            clock:
                input.clock,

            readStore:
                input.readStore,
        });


    const getIdentityForProviderUseCase =
        createGetIdentityForProviderUseCase({
            readStore: input.readStore,
            authorization,
        });

    const listIdentitiesForProviderUseCase =
        createListIdentitiesForProviderUseCase({
            readStore: input.readStore,
            authorization,
        });

    const requestPasswordResetUseCase =
        createRequestPasswordResetUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            betterAuth:
                input.betterAuth,

            outboxSubjects: {
                passwordResetRequested:
                    input.outboxSubjects.passwordResetRequested,
            },
        });

    const resetPasswordUseCase =
        createResetPasswordUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            betterAuth:
                input.betterAuth,

            credentialReadStore:
                input.credentialReadStore,

            sessionReadStore:
                input.readStore,

            collections: {
                credentials:
                    input.collections.credentials,

                sessions:
                    input.collections.sessions,
            },

            outboxSubjects: {
                credentialUpdated:
                    input.outboxSubjects.credentialUpdated,

                sessionEnded:
                    input.outboxSubjects.sessionEnded,
            },
        });

    const changePasswordUseCase =
        createChangePasswordUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            credentialReadStore:
                input.credentialReadStore,

            betterAuth:
                input.betterAuth,

            collections: {
                credentials:
                    input.collections.credentials,
            },

            outboxSubjects: {
                credentialUpdated:
                    input.outboxSubjects.credentialUpdated,
            },
        });

    const verifyEmailUseCase =
        createVerifyEmailUseCase({
            engine:
                input.engine,

            clock:
                input.clock,

            ids:
                input.ids,

            readStore:
                input.readStore,

            betterAuth:
                input.betterAuth,

            collections: {
                users:
                    input.collections.users,

                emailVerifications:
                    input.collections.emailVerifications,
            },

            outboxSubjects: {
                userEmailVerified:
                    input.outboxSubjects.userEmailVerified,

                userActivated:
                    input.outboxSubjects.userActivated,
            },
        });

    const recordKnownInvitation =
        createRecordKnownInvitationReaction({
            readStore:
                input.knownInvitationReadStore,
        });

    const expireKnownInvitation =
        createExpireKnownInvitationReaction({
            readStore:
                input.knownInvitationReadStore,
        });

    const revokeKnownInvitation =
        createRevokeKnownInvitationReaction({
            readStore:
                input.knownInvitationReadStore,
        });

    const markKnownInvitationRedeemed =
        createMarkKnownInvitationRedeemedReaction({
            readStore:
                input.knownInvitationReadStore,
        });

    return {
        api:
            createIdentityApi({
                invitationSignUpUseCase,

                verifyEmailUseCase,

                signInUseCase,

                signOutUseCase,

                currentSessionUseCase,

                currentUserUseCase,

                requestPasswordResetUseCase,

                resetPasswordUseCase,

                changePasswordUseCase,

                getIdentityForProviderUseCase,

                listIdentitiesForProviderUseCase,
            }),

        reactions:
            createIdentityReactionDispatcher({
                recordKnownInvitation,

                expireKnownInvitation,

                revokeKnownInvitation,

                markKnownInvitationRedeemed,
            }),
    };
}