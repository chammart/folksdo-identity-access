// services/membership/src/api/membership-http-error-translator.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP HTTP ERROR TRANSLATOR
// -----------------------------------------------------------------------------
// Converts Membership semantic errors into safe HTTP responses.
//
// Purpose:
//   • prevent raw exceptions from leaking to API consumers
//   • keep route adapters thin
//   • expose stable error codes
//   • preserve business meaning at the HTTP boundary
//   • preserve safe authorization decision correlation
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import {
    ZodError,
} from "zod";

import {
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotAvailableError,
    InvitationNotFoundError,
    InvalidInvitationTransitionError,
    InvalidMembershipTransitionError,
    MembershipAlreadyExistsError,
    MembershipAuthorizationDeniedError,
    MembershipAuthorizationUnavailableError,
    MembershipCommitFailedError,
    MembershipContextNotFoundError,
    MembershipError,
    MembershipNotEligibleError,
    MembershipNotFoundError,
} from "../errors";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export type MembershipHttpStatusCode =
    | 400
    | 401
    | 403
    | 404
    | 409
    | 410
    | 500
    | 503;

export interface MembershipHttpErrorTranslation {
    readonly statusCode:
    MembershipHttpStatusCode;

    readonly body: {
        readonly error: {
            readonly code:
            string;

            readonly message:
            string;

            readonly details?: {
                readonly reasonCode?:
                string;

                readonly decisionId?:
                string;
            };
        };
    };
}

// -----------------------------------------------------------------------------
// ERROR TRANSLATION
// -----------------------------------------------------------------------------

export function translateMembershipHttpError(
    error:
        unknown,
): MembershipHttpErrorTranslation {
    if (
        error instanceof ZodError
    ) {
        return toHttpError(
            400,
            "invalid_request",
            "Request body is invalid.",
        );
    }

    if (
        error
        instanceof MembershipAuthorizationDeniedError
    ) {
        return toHttpError(
            403,
            error.code,
            error.message,
            {
                reasonCode:
                    error.reasonCode,

                decisionId:
                    error.decisionId,
            },
        );
    }

    if (
        error
        instanceof MembershipAuthorizationUnavailableError
    ) {
        return toMembershipError(
            503,
            error,
        );
    }

    if (
        error instanceof SecurityError
    ) {
        const securityType =
            error.metadata.securityType;

        if (
            securityType
            === "authentication"
        ) {
            const reason =
                error.metadata.reason;

            return toHttpError(
                401,

                reason
                    === "missing_session"
                    ? "authentication_session_required"
                    : "authentication_session_invalid",

                "Authentication is required for Membership Operations.",
            );
        }

        return toHttpError(
            403,
            "membership_access_denied",
            "Access to Membership Operations was denied.",
        );
    }

    if (
        error instanceof MembershipNotFoundError
        || error instanceof MembershipContextNotFoundError
        || error instanceof InvitationNotFoundError
    ) {
        return toMembershipError(
            404,
            error,
        );
    }

    if (
        error instanceof InvitationExpiredError
    ) {
        return toMembershipError(
            410,
            error,
        );
    }

    if (
        error instanceof MembershipAlreadyExistsError
        || error instanceof InvitationNotAvailableError
    ) {
        return toMembershipError(
            409,
            error,
        );
    }

    if (
        error instanceof MembershipNotEligibleError
        || error instanceof InvitationEmailMismatchError
        || error instanceof InvalidMembershipTransitionError
        || error instanceof InvalidInvitationTransitionError
    ) {
        return toMembershipError(
            409,
            error,
        );
    }

    if (
        error instanceof MembershipCommitFailedError
    ) {
        return toMembershipError(
            500,
            error,
        );
    }

    return toHttpError(
        500,
        "membership_internal_error",
        "An unexpected Membership error occurred.",
    );
}

// -----------------------------------------------------------------------------
// RESPONSE HELPERS
// -----------------------------------------------------------------------------

function toMembershipError(
    statusCode:
        MembershipHttpStatusCode,

    error:
        MembershipError,
): MembershipHttpErrorTranslation {
    return toHttpError(
        statusCode,
        error.code,
        error.message,
    );
}

function toHttpError(
    statusCode:
        MembershipHttpStatusCode,

    code:
        string,

    message:
        string,

    details?:
        MembershipHttpErrorTranslation[
        "body"
        ][
        "error"
        ][
        "details"
        ],
): MembershipHttpErrorTranslation {
    return {
        statusCode,

        body: {
            error: {
                code,

                message,

                ...(
                    details
                        ? {
                            details,
                        }
                        : {}
                ),
            },
        },
    };
}