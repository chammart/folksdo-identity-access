// services/identity/src/errors/identity-errors.ts
// -----------------------------------------------------------------------------
// IDENTITY SEMANTIC ERRORS
// -----------------------------------------------------------------------------
// Production-safe semantic errors exposed by Identity Service™.
//
// Purpose:
//   • avoid raw Error leakage across service/API boundaries
//   • preserve business meaning
//   • keep HTTP translation deterministic
// -----------------------------------------------------------------------------

export class IdentityError extends Error {
    public readonly code: string;

    public constructor(
        code: string,
        message: string,
    ) {
        super(message);

        this.name =
            new.target.name;

        this.code =
            code;
    }
}

// -----------------------------------------------------------------------------
// INVITATION ERRORS
// -----------------------------------------------------------------------------

export class InvitationNotFoundError extends IdentityError {
    public constructor() {
        super(
            "invitation_not_found",
            "Invitation was not found.",
        );
    }
}

export class InvitationExpiredError extends IdentityError {
    public constructor() {
        super(
            "invitation_expired",
            "Invitation has expired.",
        );
    }
}

export class InvitationRevokedError extends IdentityError {
    public constructor() {
        super(
            "invitation_revoked",
            "Invitation was revoked.",
        );
    }
}

export class InvitationAlreadyRedeemedError extends IdentityError {
    public constructor() {
        super(
            "invitation_already_redeemed",
            "Invitation was already redeemed.",
        );
    }
}

export class InvitationEmailMismatchError extends IdentityError {
    public constructor() {
        super(
            "invitation_email_mismatch",
            "Signup email does not match invited email.",
        );
    }
}

// -----------------------------------------------------------------------------
// SIGNUP AND VERIFICATION ERRORS
// -----------------------------------------------------------------------------

export class InvalidSignupStateError extends IdentityError {
    public constructor(
        message =
            "Invalid signup state.",
    ) {
        super(
            "invalid_signup_state",
            message,
        );
    }
}

export class DuplicateIdentityConflictError extends IdentityError {
    public constructor() {
        super(
            "duplicate_identity_conflict",
            "Identity already exists.",
        );
    }
}

export class InvalidVerificationTokenError extends IdentityError {
    public constructor() {
        super(
            "invalid_verification_token",
            "Verification token is invalid.",
        );
    }
}

export class UserAlreadyVerifiedError extends IdentityError {
    public constructor() {
        super(
            "user_already_verified",
            "User is already verified.",
        );
    }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION ERRORS
// -----------------------------------------------------------------------------

export class InvalidAuthenticationCredentialsError extends IdentityError {
    public constructor() {
        super(
            "invalid_authentication_credentials",
            "Authentication credentials are invalid.",
        );
    }
}

export class IdentityNotEligibleForSignInError extends IdentityError {
    public constructor() {
        super(
            "identity_not_eligible_for_sign_in",
            "Identity is not eligible for sign in.",
        );
    }
}

// -----------------------------------------------------------------------------
// SESSION ERRORS
// -----------------------------------------------------------------------------

export class SessionNotFoundError extends IdentityError {
    public constructor() {
        super(
            "session_not_found",
            "Session was not found.",
        );
    }
}

export class SessionNotActiveError extends IdentityError {
    public constructor() {
        super(
            "session_not_active",
            "Session is not active.",
        );
    }
}

export class AuthenticationSessionRequiredError extends IdentityError {
    public constructor() {
        super(
            "authentication_session_required",
            "Authentication session is required.",
        );
    }
}

export class CurrentSessionNotFoundError extends IdentityError {
    public constructor() {
        super(
            "session_not_found",
            "Session was not found.",
        );
    }
}

export class CurrentSessionNotActiveError extends IdentityError {
    public constructor() {
        super(
            "session_not_active",
            "Session is not active.",
        );
    }
}

export class CurrentSessionExpiredError extends IdentityError {
    public constructor() {
        super(
            "session_expired",
            "Session has expired.",
        );
    }
}

export class ProviderSessionRevocationFailedError extends IdentityError {
    public constructor() {
        super(
            "provider_session_revocation_failed",
            "Provider session revocation failed.",
        );
    }
}

// -----------------------------------------------------------------------------
// CURRENT USER ERRORS
// -----------------------------------------------------------------------------

export class CurrentUserNotFoundError extends IdentityError {
    public constructor() {
        super(
            "user_not_found",
            "User was not found.",
        );
    }
}

export class CurrentUserNotEligibleError extends IdentityError {
    public constructor() {
        super(
            "user_not_eligible",
            "User is not eligible for current user resolution.",
        );
    }
}

// -----------------------------------------------------------------------------
// PASSWORD RESET ERRORS
// -----------------------------------------------------------------------------

export class PasswordResetRequestFailedError extends IdentityError {
    public constructor() {
        super(
            "password_reset_request_failed",
            "Password reset request failed.",
        );
    }
}

export class InvalidPasswordResetTokenError extends IdentityError {
    public constructor() {
        super(
            "invalid_password_reset_token",
            "Password reset token is invalid or expired.",
        );
    }
}

// -----------------------------------------------------------------------------
// PASSWORD CHANGE ERRORS
// -----------------------------------------------------------------------------

export class InvalidCurrentPasswordError extends IdentityError {
    public constructor() {
        super(
            "invalid_current_password",
            "Current password is invalid.",
        );
    }
}

export class PasswordReuseNotAllowedError extends IdentityError {
    public constructor() {
        super(
            "password_reuse_not_allowed",
            "New password must be different from the current password.",
        );
    }
}

export class PasswordChangeFailedError extends IdentityError {
    public constructor() {
        super(
            "password_change_failed",
            "Password change failed.",
        );
    }
}

// -----------------------------------------------------------------------------
// PASSWORD POLICY ERRORS
// -----------------------------------------------------------------------------

export class WeakPasswordError extends IdentityError {
    public constructor(
        message =
            "Password does not meet policy requirements.",
    ) {
        super(
            "weak_password",
            message,
        );
    }
}

// -----------------------------------------------------------------------------
// COMMIT ERRORS
// -----------------------------------------------------------------------------

export class IdentityCommitFailedError extends IdentityError {
    public constructor() {
        super(
            "identity_commit_failed",
            "Identity state commit failed.",
        );
    }
}

// -----------------------------------------------------------------------------
// PROVIDER READ AUTHORIZATION ERRORS
// -----------------------------------------------------------------------------

export class IdentityAuthorizationDeniedError extends IdentityError {
    public readonly reasonCode: string;
    public readonly decisionId: string;

    public constructor(reasonCode: string, decisionId: string) {
        super("identity_access_denied", "Access to Identity Operations was denied.");
        this.reasonCode = reasonCode;
        this.decisionId = decisionId;
    }
}

export class IdentityAuthorizationUnavailableError extends IdentityError {
    public constructor(_cause?: unknown) {
        super("identity_authorization_unavailable", "Identity authorization is temporarily unavailable.");
    }
}

export class IdentityUserNotFoundError extends IdentityError {
    public constructor(_userId?: string) {
        super("identity_user_not_found", "Identity user was not found.");
    }
}
