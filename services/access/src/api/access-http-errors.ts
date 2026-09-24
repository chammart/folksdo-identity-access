// services/access/src/api/access-http-errors.ts
// -----------------------------------------------------------------------------
// ACCESS HTTP ERRORS
// -----------------------------------------------------------------------------
// Translates Access Operations™ application failures into stable HTTP errors.
//
// Purpose:
//   • keep HTTP status decisions outside Access use cases
//   • expose stable machine-readable transport error codes
//   • preserve semantic Access error information
//   • prevent internal infrastructure details from leaking to clients
//
// Boundary:
//   • contains no Fastify route registration
//   • contains no request validation
//   • contains no logging or observability side effects
//   • contains no business lifecycle decisions
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import {
    AccessAdministrativeAuthorizationDeniedError,
    AccessAdministrativeAuthorizationUnavailableError,
    AccessError,
} from "../errors";

// -----------------------------------------------------------------------------
// HTTP ERROR BODY
// -----------------------------------------------------------------------------

export interface AccessHttpErrorBody {
    readonly error: {
        readonly code: string;

        readonly message: string;

        readonly details?: unknown;
    };
}

// -----------------------------------------------------------------------------
// HTTP ERROR
// -----------------------------------------------------------------------------

export class AccessHttpError extends Error {
    public constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
        public readonly details?: unknown,
        options?: {
            readonly cause?: unknown;
        },
    ) {
        super(
            message,
            options,
        );

        this.name =
            "AccessHttpError";
    }

    public toResponseBody(): AccessHttpErrorBody {
        return {
            error: {
                code:
                    this.code,

                message:
                    this.message,

                details:
                    this.details,
            },
        };
    }
}

// -----------------------------------------------------------------------------
// STANDARD HTTP ERRORS
// -----------------------------------------------------------------------------

export class AccessBadRequestHttpError
    extends AccessHttpError {
    public constructor(
        code: string,
        message: string,
        details?: unknown,
        cause?: unknown,
    ) {
        super(
            400,
            code,
            message,
            details,
            {
                cause,
            },
        );

        this.name =
            "AccessBadRequestHttpError";
    }
}

export class AccessUnauthorizedHttpError
    extends AccessHttpError {
    public constructor(
        message = "Authentication is required.",
        cause?: unknown,
    ) {
        super(
            401,
            "access_authentication_required",
            message,
            undefined,
            {
                cause,
            },
        );

        this.name =
            "AccessUnauthorizedHttpError";
    }
}

export class AccessForbiddenHttpError
    extends AccessHttpError {
    public constructor(
        code = "access_forbidden",
        message = "The actor is not authorized to perform this action.",
        details?: unknown,
        cause?: unknown,
    ) {
        super(
            403,
            code,
            message,
            details,
            {
                cause,
            },
        );

        this.name =
            "AccessForbiddenHttpError";
    }
}

export class AccessNotFoundHttpError
    extends AccessHttpError {
    public constructor(
        code: string,
        message: string,
        cause?: unknown,
    ) {
        super(
            404,
            code,
            message,
            undefined,
            {
                cause,
            },
        );

        this.name =
            "AccessNotFoundHttpError";
    }
}

export class AccessConflictHttpError
    extends AccessHttpError {
    public constructor(
        code: string,
        message: string,
        details?: unknown,
        cause?: unknown,
    ) {
        super(
            409,
            code,
            message,
            details,
            {
                cause,
            },
        );

        this.name =
            "AccessConflictHttpError";
    }
}

export class AccessUnprocessableEntityHttpError
    extends AccessHttpError {
    public constructor(
        code: string,
        message: string,
        details?: unknown,
        cause?: unknown,
    ) {
        super(
            422,
            code,
            message,
            details,
            {
                cause,
            },
        );

        this.name =
            "AccessUnprocessableEntityHttpError";
    }
}

export class AccessInternalServerHttpError
    extends AccessHttpError {
    public constructor(
        message = "Access Operations could not complete the request.",
        cause?: unknown,
    ) {
        super(
            500,
            "access_internal_error",
            message,
            undefined,
            {
                cause,
            },
        );

        this.name =
            "AccessInternalServerHttpError";
    }
}

export class AccessServiceUnavailableHttpError
    extends AccessHttpError {
    public constructor(
        message = "Access Operations is temporarily unavailable.",
        cause?: unknown,
    ) {
        super(
            503,
            "access_service_unavailable",
            message,
            undefined,
            {
                cause,
            },
        );

        this.name =
            "AccessServiceUnavailableHttpError";
    }
}

// -----------------------------------------------------------------------------
// VALIDATION ERROR
// -----------------------------------------------------------------------------

export interface AccessHttpValidationIssue {
    readonly path: string;

    readonly code: string;

    readonly message: string;
}

export class AccessValidationHttpError
    extends AccessBadRequestHttpError {
    public constructor(
        issues:
            readonly AccessHttpValidationIssue[],
    ) {
        super(
            "access_request_invalid",
            "The Access request is invalid.",
            {
                issues,
            },
        );

        this.name =
            "AccessValidationHttpError";
    }
}

// -----------------------------------------------------------------------------
// ACCESS ERROR TRANSLATION
// -----------------------------------------------------------------------------

export function translateAccessHttpError(
    error: unknown,
): AccessHttpError {
    if (
        error
        instanceof AccessHttpError
    ) {
        return error;
    }

    if (
        error
        instanceof SecurityError
    ) {
        const securityType =
            error.metadata.securityType;

        if (
            securityType === "authentication"
        ) {
            const reason =
                error.metadata.reason;

            return new AccessHttpError(
                401,
                reason === "missing_session"
                    ? "authentication_session_required"
                    : "authentication_session_invalid",
                "Authentication is required for Access Operations.",
                undefined,
                {
                    cause:
                        error,
                },
            );
        }

        return new AccessForbiddenHttpError(
            "access_context_required",
            "An active Membership context is required for Access Operations.",
            undefined,
            error,
        );
    }

    if (
        error
        instanceof AccessAdministrativeAuthorizationDeniedError
    ) {
        return new AccessForbiddenHttpError(
            "access_authorization_denied",
            error.message,
            {
                reasonCode:
                    error.reasonCode,

                ...(error.decisionId === undefined
                    ? {}
                    : {
                        decisionId:
                            error.decisionId,
                    }),
            },
            error,
        );
    }

    if (
        error
        instanceof AccessAdministrativeAuthorizationUnavailableError
    ) {
        return new AccessServiceUnavailableHttpError(
            error.message,
            error,
        );
    }

    if (
        error
        instanceof AccessError
    ) {
        return translateSemanticAccessError(
            error,
        );
    }

    return new AccessInternalServerHttpError(
        undefined,
        error,
    );
}

// -----------------------------------------------------------------------------
// SEMANTIC ACCESS ERROR TRANSLATION
// -----------------------------------------------------------------------------

function translateSemanticAccessError(
    error: AccessError,
): AccessHttpError {
    switch (error.code) {

        // ---------------------------------------------------------------------
        // NOT FOUND
        // ---------------------------------------------------------------------

        case "permission_not_found":
        case "role_not_found":
        case "role_assignment_not_found":
        case "permission_assignment_not_found":
        case "authorization_policy_not_found":
        case "restriction_not_found":
        case "membership_access_context_not_found":
        case "tenant_access_context_not_found":
            return new AccessNotFoundHttpError(
                error.code,
                error.message,
                error,
            );

        // ---------------------------------------------------------------------
        // CONFLICT
        // ---------------------------------------------------------------------

        case "permission_already_exists":
        case "role_already_exists":
        case "role_assignment_already_exists":
        case "permission_assignment_already_exists":
        case "authorization_policy_already_exists":
        case "restriction_already_exists":
            return new AccessConflictHttpError(
                error.code,
                error.message,
                undefined,
                error,
            );

        // ---------------------------------------------------------------------
        // BUSINESS STATE
        // ---------------------------------------------------------------------

        case "role_not_active":
        case "role_assignment_not_active":
        case "permission_assignment_not_active":
        case "authorization_policy_not_active":
            return new AccessUnprocessableEntityHttpError(
                error.code,
                error.message,
                undefined,
                error,
            );

        // ---------------------------------------------------------------------
        // AUTHORIZATION
        // ---------------------------------------------------------------------

        case "authorization_denied":
            return new AccessForbiddenHttpError(
                error.code,
                error.message,
                undefined,
                error,
            );

        case "authorization_context_invalid":
        case "authorization_subject_invalid":
        case "authorization_scope_invalid":
            return new AccessBadRequestHttpError(
                error.code,
                error.message,
                undefined,
                error,
            );

        // ---------------------------------------------------------------------
        // INVALID TRANSITIONS
        // ---------------------------------------------------------------------

        case "invalid_role_transition":
        case "invalid_role_assignment_transition":
        case "invalid_permission_assignment_transition":
        case "invalid_authorization_policy_transition":
        case "invalid_identity_access_transition":
            return new AccessConflictHttpError(
                error.code,
                error.message,
                undefined,
                error,
            );

        // ---------------------------------------------------------------------
        // ENGINE
        // ---------------------------------------------------------------------

        case "administrative_authorization_denied":
            return new AccessForbiddenHttpError(
                "access_authorization_denied",
                error.message,
                undefined,
                error,
            );

        case "administrative_authorization_unavailable":
        case "access_commit_failed":
            return new AccessServiceUnavailableHttpError(
                error.message,
                error,
            );

        // ---------------------------------------------------------------------
        // EXHAUSTIVE
        // ---------------------------------------------------------------------

        default: {
            const exhaustive: never = error.code;

            return new AccessInternalServerHttpError(
                `Unhandled Access error: ${exhaustive}`,
                error,
            );
        }
    }
}

// -----------------------------------------------------------------------------
// ERROR RESPONSE
// -----------------------------------------------------------------------------

export function toAccessHttpErrorBody(
    error: unknown,
): {
    readonly statusCode: number;

    readonly body: AccessHttpErrorBody;
} {
    const translated =
        translateAccessHttpError(
            error,
        );

    return {
        statusCode:
            translated.statusCode,

        body:
            translated.toResponseBody(),
    };
}

// -----------------------------------------------------------------------------
// TYPE GUARD
// -----------------------------------------------------------------------------

export function isAccessHttpError(
    error: unknown,
): error is AccessHttpError {
    return (
        error
        instanceof AccessHttpError
    );
}

// -----------------------------------------------------------------------------
// EXHAUSTIVENESS
// -----------------------------------------------------------------------------

function assertUnhandledAccessError(
    error: AccessError,
): AccessHttpError {
    return new AccessInternalServerHttpError(
        "Access Operations encountered an unhandled semantic error.",
        error,
    );
}