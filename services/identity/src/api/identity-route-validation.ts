// services/identity/src/api/identity-route-validation.ts
// -----------------------------------------------------------------------------
// IDENTITY ROUTE VALIDATION
// -----------------------------------------------------------------------------
// Transport-level validation for Identity HTTP routes.
// -----------------------------------------------------------------------------

import {
    z,
} from "zod";

import {
    AuthenticationSessionRequiredError,
} from "../errors";

import type {
    ChangePasswordRequest,
    CurrentSessionRequest,
    CurrentUserRequest,
    InvitationSignUpRequest,
    RequestPasswordResetRequest,
    ResetPasswordRequest,
    SignInRequest,
    SignOutRequest,
    VerifyEmailRequest,
} from "./identity-dtos";

// -----------------------------------------------------------------------------
// SCHEMAS
// -----------------------------------------------------------------------------

const invitationSignUpSchema =
    z.object({
        invitationToken:
            z.string()
                .min(
                    1,
                ),

        email:
            z.string()
                .email(),

        password:
            z.string()
                .min(
                    12,
                ),

        displayName:
            z.string()
                .min(
                    1,
                )
                .optional(),

        locale:
            z.string()
                .min(
                    1,
                )
                .optional(),

        timezone:
            z.string()
                .min(
                    1,
                )
                .optional(),
    });

const verifyEmailSchema =
    z.object({
        verificationId:
            z.string()
                .min(
                    1,
                ),

        verificationToken:
            z.string()
                .min(
                    1,
                ),
    });

const signInSchema =
    z.object({
        email:
            z.string()
                .email(),

        password:
            z.string()
                .min(
                    1,
                ),
    });

const signOutSchema =
    z.object({
        sessionId:
            z.string()
                .min(
                    1,
                ),
    });

const requestPasswordResetSchema =
    z.object({
        email:
            z.string()
                .email(),
    });

const resetPasswordSchema =
    z.object({
        token:
            z.string()
                .min(
                    1,
                ),

        newPassword:
            z.string()
                .min(
                    12,
                ),
    });

const changePasswordSchema =
    z.object({
        currentPassword:
            z.string()
                .min(
                    1,
                ),

        newPassword:
            z.string()
                .min(
                    12,
                ),

        revokeOtherSessions:
            z.boolean()
                .optional()
                .default(
                    true,
                ),
    });

// -----------------------------------------------------------------------------
// PARSERS
// -----------------------------------------------------------------------------

export function parseInvitationSignUpRequest(
    value:
        unknown,
): InvitationSignUpRequest {
    return invitationSignUpSchema.parse(
        value,
    );
}

export function parseVerifyEmailRequest(
    value:
        unknown,
): VerifyEmailRequest {
    return verifyEmailSchema.parse(
        value,
    );
}

export function parseSignInRequest(
    value:
        unknown,
): SignInRequest {
    return signInSchema.parse(
        value,
    );
}

export function parseSignOutRequest(
    value:
        unknown,
): SignOutRequest {
    return signOutSchema.parse(
        value,
    );
}

export function parseRequestPasswordResetRequest(
    value:
        unknown,
): RequestPasswordResetRequest {
    return requestPasswordResetSchema.parse(
        value,
    );
}

export function parseResetPasswordRequest(
    value:
        unknown,
): ResetPasswordRequest {
    return resetPasswordSchema.parse(
        value,
    );
}

export function parseChangePasswordRequest(
    value:
        unknown,
): ChangePasswordRequest {
    return changePasswordSchema.parse(
        value,
    );
}

export function parseCurrentSessionRequest(
    sessionId:
        unknown,
): CurrentSessionRequest {
    return parseAuthenticatedSessionReference(
        sessionId,
    );
}

export function parseCurrentUserRequest(
    sessionId:
        unknown,
): CurrentUserRequest {
    return parseAuthenticatedSessionReference(
        sessionId,
    );
}

// -----------------------------------------------------------------------------
// AUTHENTICATED SESSION REFERENCE
// -----------------------------------------------------------------------------

function parseAuthenticatedSessionReference(
    sessionId:
        unknown,
): CurrentSessionRequest {
    if (
        typeof sessionId !==
        "string"
        || !sessionId.trim()
    ) {
        throw new AuthenticationSessionRequiredError();
    }

    return signOutSchema.parse({
        sessionId,
    });
}

const providerIdentityUserIdSchema = z.object({
    userId: z.string().trim().min(1),
}).strict();

const providerIdentityListQuerySchema = z.object({
    status: z.enum(["pending_email_verification", "active", "suspended", "disabled"]).optional(),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(200).default(100),
}).strict();

export function parseProviderIdentityParams(input: unknown) {
    return providerIdentityUserIdSchema.parse(input);
}

export function parseProviderIdentityListRequest(input: unknown) {
    return providerIdentityListQuerySchema.parse(input);
}
