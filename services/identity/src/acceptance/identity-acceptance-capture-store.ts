// services/identity/src/acceptance/identity-acceptance-capture-store.ts
// -----------------------------------------------------------------------------
// IDENTITY ACCEPTANCE CAPTURE STORE
// -----------------------------------------------------------------------------
// Local and staging operational support for deterministic acceptance
// certification.
//
// Purpose:
//   • capture BetterAuth verification and password-reset tokens
//   • persist raw tokens outside public APIs
//   • associate provider captures with Identity-owned lifecycle identifiers
//   • allow repository-owned certification tooling to consume the captures
//
// Safety:
//   • disabled by default
//   • enabled only by explicit Identity configuration
//   • never exposes an Identity public fixture endpoint
//   • raw tokens remain confined to the configured acceptance database
// -----------------------------------------------------------------------------

import type {
    Collection,
    Db,
    Document,
} from "mongodb";

import type {
    SendBetterAuthResetPassword,
    SendBetterAuthResetPasswordInput,
    SendBetterAuthVerificationEmail,
    SendBetterAuthVerificationEmailInput,
} from "../adapters";

// -----------------------------------------------------------------------------
// COLLECTION
// -----------------------------------------------------------------------------

export const DEFAULT_IDENTITY_ACCEPTANCE_CAPTURES_COLLECTION =
    "identity_acceptance_captures";

// -----------------------------------------------------------------------------
// CONTRACTS
// -----------------------------------------------------------------------------

export type IdentityAcceptanceCaptureKind =
    | "email_verification"
    | "password_reset";

export interface CreateIdentityAcceptanceCaptureSendersInput {
    readonly database:
    Db;

    readonly collectionName:
    string;
}

export interface LinkIdentityEmailVerificationCaptureInput {
    readonly email:
    string;

    readonly userId:
    string;

    readonly verificationId:
    string;
}

export interface IdentityAcceptanceCaptureSenders {
    readonly verification:
    SendBetterAuthVerificationEmail;

    readonly passwordReset:
    SendBetterAuthResetPassword;

    readonly linkEmailVerification:
    (
        input:
            LinkIdentityEmailVerificationCaptureInput,
    ) => Promise<void>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createIdentityAcceptanceCaptureSenders(
    input:
        CreateIdentityAcceptanceCaptureSendersInput,
): IdentityAcceptanceCaptureSenders {
    const collection =
        input.database.collection(
            input.collectionName,
        );

    return {
        verification: {
            async send(
                capture:
                    SendBetterAuthVerificationEmailInput,
            ): Promise<void> {
                await persistCapture({
                    collection,

                    kind:
                        "email_verification",

                    email:
                        capture.email,

                    token:
                        capture.token,

                    url:
                        capture.url,
                });
            },
        },

        passwordReset: {
            async send(
                capture:
                    SendBetterAuthResetPasswordInput,
            ): Promise<void> {
                await persistCapture({
                    collection,

                    kind:
                        "password_reset",

                    email:
                        capture.email,

                    token:
                        capture.token,

                    url:
                        capture.url,
                });
            },
        },

        async linkEmailVerification(
            linkInput:
                LinkIdentityEmailVerificationCaptureInput,
        ): Promise<void> {
            await linkEmailVerificationCapture({
                collection,

                email:
                    linkInput.email,

                userId:
                    linkInput.userId,

                verificationId:
                    linkInput.verificationId,
            });
        },
    };
}

// -----------------------------------------------------------------------------
// CAPTURE PERSISTENCE
// -----------------------------------------------------------------------------

async function persistCapture(
    input: {
        readonly collection:
        Collection<Document>;

        readonly kind:
        IdentityAcceptanceCaptureKind;

        readonly email:
        string;

        readonly token:
        string;

        readonly url:
        string;
    },
): Promise<void> {
    const email =
        normalizeEmail(
            input.email,
        );

    const capturedAt =
        new Date()
            .toISOString();

    await input.collection.updateOne(
        {
            kind:
                input.kind,

            email,
        },
        {
            $set: {
                kind:
                    input.kind,

                email,

                token:
                    input.token,

                url:
                    input.url,

                capturedAt,
            },
        },
        {
            upsert:
                true,
        },
    );
}

// -----------------------------------------------------------------------------
// IDENTITY LIFECYCLE LINKING
// -----------------------------------------------------------------------------

async function linkEmailVerificationCapture(
    input: {
        readonly collection:
        Collection<Document>;

        readonly email:
        string;

        readonly userId:
        string;

        readonly verificationId:
        string;
    },
): Promise<void> {
    const email =
        normalizeEmail(
            input.email,
        );

    const linkedAt =
        new Date()
            .toISOString();

    await input.collection.updateOne(
        {
            kind:
                "email_verification",

            email,
        },
        {
            $set: {
                kind:
                    "email_verification",

                email,

                userId:
                    input.userId,

                referenceId:
                    input.verificationId,

                verificationId:
                    input.verificationId,

                linkedAt,
            },
        },
        {
            upsert:
                true,
        },
    );
}

// -----------------------------------------------------------------------------
// VALUE HELPERS
// -----------------------------------------------------------------------------

function normalizeEmail(
    email:
        string,
): string {
    return email
        .trim()
        .toLowerCase();
}