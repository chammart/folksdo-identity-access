// services/identity/src/api/identity-http-error-translator.ts
// -----------------------------------------------------------------------------
// IDENTITY HTTP ERROR TRANSLATOR
// -----------------------------------------------------------------------------
// Converts Identity semantic errors into safe HTTP responses.
//
// Purpose:
//   • prevent raw exceptions from leaking to API consumers
//   • keep route adapters thin
//   • expose stable error codes
//   • preserve business meaning at the HTTP boundary
//
// Cross-package boundary:
//
//   Identity semantic errors may originate from another workspace package
//   instance, such as the host-owned authenticated context resolver.
//
//   Runtime constructor identity is not guaranteed across separately built
//   package entry points. Therefore, host-produced authentication errors are
//   recognized through their stable semantic error codes.
//
//   Only explicitly supported codes are accepted structurally. Unknown objects
//   still resolve to the safe internal_server_error response.
// -----------------------------------------------------------------------------

import {
    ZodError,
} from "zod";

import {
    AuthenticationSessionRequiredError,
    CurrentSessionExpiredError,
    CurrentSessionNotActiveError,
    CurrentSessionNotFoundError,
    CurrentUserNotEligibleError,
    CurrentUserNotFoundError,
    DuplicateIdentityConflictError,
    IdentityError,
    IdentityNotEligibleForSignInError,
    IdentityAuthorizationDeniedError,
    IdentityAuthorizationUnavailableError,
    IdentityUserNotFoundError,
    InvalidAuthenticationCredentialsError,
    InvalidCurrentPasswordError,
    InvalidPasswordResetTokenError,
    InvalidSignupStateError,
    InvalidVerificationTokenError,
    InvitationAlreadyRedeemedError,
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvitationRevokedError,
    PasswordChangeFailedError,
    PasswordResetRequestFailedError,
    PasswordReuseNotAllowedError,
    ProviderSessionRevocationFailedError,
    SessionNotActiveError,
    SessionNotFoundError,
    UserAlreadyVerifiedError,
    WeakPasswordError,
} from "../errors";

// -----------------------------------------------------------------------------
// CONTRACTS
// -----------------------------------------------------------------------------

export type IdentityHttpStatusCode =
    | 400
    | 401
    | 403
    | 404
    | 409
    | 410
    | 500;

export interface IdentityHttpErrorTranslation {
    readonly statusCode:
    IdentityHttpStatusCode;

    readonly body: {
        readonly error: {
            readonly code:
            string;

            readonly message:
            string;
        };
    };
}

// -----------------------------------------------------------------------------
// TRANSLATOR
// -----------------------------------------------------------------------------

export function translateIdentityHttpError(
    error:
        unknown,
): IdentityHttpErrorTranslation {
    if (
        error instanceof
        ZodError
    ) {
        return toHttpError(
            400,
            "validation_error",
            "Request body is invalid.",
        );
    }

    // -------------------------------------------------------------------------
    // CROSS-PACKAGE AUTHENTICATION FAILURES
    // -------------------------------------------------------------------------
    // These errors may be created by the host through the published Identity
    // errors package entry point and then received by Identity source routes.
    //
    // Their constructors can therefore be duplicated at runtime even though
    // their semantic contracts are identical.
    //
    // Canonical messages are supplied here rather than trusting an arbitrary
    // external object's message property.
    // -------------------------------------------------------------------------

    const semanticCode =
        readSemanticErrorCode(
            error,
        );

    if (
        semanticCode ===
        "authentication_session_required"
    ) {
        return toHttpError(
            401,
            "authentication_session_required",
            "Authentication session is required.",
        );
    }

    if (
        semanticCode ===
        "invalid_authentication_credentials"
    ) {
        return toHttpError(
            401,
            "invalid_authentication_credentials",
            "Authentication credentials are invalid.",
        );
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATION FAILURES
    // -------------------------------------------------------------------------

    if (
        error instanceof
        AuthenticationSessionRequiredError
        || error instanceof
        CurrentSessionNotFoundError
        || error instanceof
        CurrentSessionNotActiveError
        || error instanceof
        CurrentSessionExpiredError
        || error instanceof
        CurrentUserNotFoundError
        || error instanceof
        InvalidAuthenticationCredentialsError
        || error instanceof
        InvalidCurrentPasswordError
        || error instanceof
        InvalidPasswordResetTokenError
    ) {
        return toIdentityError(
            401,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // AUTHORIZATION / ELIGIBILITY FAILURES
    // -------------------------------------------------------------------------

    if (
        error instanceof
        CurrentUserNotEligibleError
        || error instanceof
        IdentityNotEligibleForSignInError
        || error instanceof
        IdentityAuthorizationDeniedError
    ) {
        return toIdentityError(
            403,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // NOT FOUND
    // -------------------------------------------------------------------------

    if (
        error instanceof
        IdentityUserNotFoundError
    ) {
        return toIdentityError(
            404,
            error,
        );
    }

    if (
        error instanceof
        SessionNotFoundError
    ) {
        return toIdentityError(
            404,
            error,
        );
    }

    if (
        error instanceof
        InvitationNotFoundError
    ) {
        return toIdentityError(
            404,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // CONFLICT
    // -------------------------------------------------------------------------

    if (
        error instanceof
        SessionNotActiveError
    ) {
        return toIdentityError(
            409,
            error,
        );
    }

    if (
        error instanceof
        InvitationEmailMismatchError
        || error instanceof
        InvitationAlreadyRedeemedError
        || error instanceof
        DuplicateIdentityConflictError
        || error instanceof
        UserAlreadyVerifiedError
        || error instanceof
        PasswordReuseNotAllowedError
    ) {
        return toIdentityError(
            409,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // GONE
    // -------------------------------------------------------------------------

    if (
        error instanceof
        InvitationExpiredError
        || error instanceof
        InvitationRevokedError
    ) {
        return toIdentityError(
            410,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // INVALID BUSINESS INPUT
    // -------------------------------------------------------------------------

    if (
        error instanceof
        InvalidSignupStateError
        || error instanceof
        InvalidVerificationTokenError
        || error instanceof
        WeakPasswordError
    ) {
        return toIdentityError(
            400,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // PROVIDER / INTERNAL BUSINESS FAILURE
    // -------------------------------------------------------------------------

    if (
        error instanceof
        IdentityAuthorizationUnavailableError
        || error instanceof
        ProviderSessionRevocationFailedError
        || error instanceof
        PasswordResetRequestFailedError
        || error instanceof
        PasswordChangeFailedError
    ) {
        return toIdentityError(
            500,
            error,
        );
    }

    // -------------------------------------------------------------------------
    // UNKNOWN FAILURE
    // -------------------------------------------------------------------------

    return toHttpError(
        500,
        "internal_server_error",
        "Unexpected Identity error.",
    );
}

// -----------------------------------------------------------------------------
// SEMANTIC ERROR RECOGNITION
// -----------------------------------------------------------------------------

function readSemanticErrorCode(
    error:
        unknown,
): string | undefined {
    if (
        error ===
        null
        || typeof error !==
        "object"
    ) {
        return undefined;
    }

    const code =
        (
            error as {
                readonly code?:
                unknown;
            }
        ).code;

    return typeof code ===
        "string"
        ? code
        : undefined;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function toIdentityError(
    statusCode:
        IdentityHttpStatusCode,

    error:
        IdentityError,
): IdentityHttpErrorTranslation {
    return toHttpError(
        statusCode,
        error.code,
        error.message,
    );
}

function toHttpError(
    statusCode:
        IdentityHttpStatusCode,

    code:
        string,

    message:
        string,
): IdentityHttpErrorTranslation {
    return {
        statusCode,

        body: {
            error: {
                code,

                message,
            },
        },
    };
}