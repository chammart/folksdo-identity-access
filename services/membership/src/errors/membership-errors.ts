// services/membership/src/errors/membership-errors.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP SEMANTIC ERRORS
// -----------------------------------------------------------------------------
// Production-safe semantic errors exposed by Membership Operations™.
//
// Purpose:
//   • avoid raw Error leakage across service/API boundaries
//   • preserve business meaning
//   • preserve authorization decision correlation safely
//   • distinguish authorization denial from authorization unavailability
//   • keep HTTP translation deterministic
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MEMBERSHIP ERROR CODES
// -----------------------------------------------------------------------------

export type MembershipErrorCode =
    | "membership_not_found"
    | "membership_already_exists"
    | "membership_not_eligible"
    | "membership_context_not_found"
    | "membership_access_denied"
    | "membership_authorization_unavailable"
    | "invitation_not_found"
    | "invitation_expired"
    | "invitation_not_available"
    | "invitation_email_mismatch"
    | "invalid_membership_transition"
    | "invalid_invitation_transition"
    | "membership_commit_failed";

// -----------------------------------------------------------------------------
// BASE MEMBERSHIP ERROR
// -----------------------------------------------------------------------------

export class MembershipError extends Error {
    public readonly code:
        MembershipErrorCode;

    public constructor(
        code:
            MembershipErrorCode,

        message:
            string,
    ) {
        super(
            message,
        );

        this.name =
            new.target.name;

        this.code =
            code;
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP AUTHORIZATION ERRORS
// -----------------------------------------------------------------------------

export class MembershipAuthorizationDeniedError
    extends MembershipError {
    public readonly reasonCode:
        string;

    public readonly decisionId:
        string;

    public constructor(
        reasonCode:
            string,

        decisionId:
            string,
    ) {
        super(
            "membership_access_denied",
            "Access to Membership Operations was denied.",
        );

        this.reasonCode =
            reasonCode;

        this.decisionId =
            decisionId;
    }
}

export class MembershipAuthorizationUnavailableError
    extends MembershipError {
    public constructor(
        _cause?:
            unknown,
    ) {
        super(
            "membership_authorization_unavailable",
            "Membership authorization is temporarily unavailable.",
        );
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP RESOURCE ERRORS
// -----------------------------------------------------------------------------

export class MembershipNotFoundError
    extends MembershipError {
    public constructor(
        _membershipId?:
            string,
    ) {
        super(
            "membership_not_found",
            "Membership was not found.",
        );
    }
}

export class MembershipContextNotFoundError
    extends MembershipError {
    public constructor(
        _identityId?:
            string,
    ) {
        super(
            "membership_context_not_found",
            "Membership context was not found.",
        );
    }
}

export class InvitationNotFoundError
    extends MembershipError {
    public constructor(
        _invitationId?:
            string,
    ) {
        super(
            "invitation_not_found",
            "Invitation was not found.",
        );
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONFLICT ERRORS
// -----------------------------------------------------------------------------

export class MembershipAlreadyExistsError
    extends MembershipError {
    public constructor(
        _identityId?:
            string,

        _tenantId?:
            string,
    ) {
        super(
            "membership_already_exists",
            "Membership already exists.",
        );
    }
}

export class InvitationNotAvailableError
    extends MembershipError {
    public constructor(
        _invitationId?:
            string,
    ) {
        super(
            "invitation_not_available",
            "Invitation is no longer available.",
        );
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP VALIDATION ERRORS
// -----------------------------------------------------------------------------

export class MembershipNotEligibleError
    extends MembershipError {
    public constructor(
        _membershipId?:
            string,

        _reason?:
            string,
    ) {
        super(
            "membership_not_eligible",
            "Membership is not eligible for this operation.",
        );
    }
}

export class InvitationExpiredError
    extends MembershipError {
    public constructor(
        _invitationId?:
            string,

        _expiresAt?:
            string,
    ) {
        super(
            "invitation_expired",
            "Invitation has expired.",
        );
    }
}

export class InvitationEmailMismatchError
    extends MembershipError {
    public constructor(
        _invitationId?:
            string,

        _invitedEmail?:
            string,

        _identityEmail?:
            string,
    ) {
        super(
            "invitation_email_mismatch",
            "Invitation email does not match the Identity email.",
        );
    }
}

export class InvalidMembershipTransitionError
    extends MembershipError {
    public constructor(
        from:
            string,

        to:
            string,

        _membershipId?:
            string,
    ) {
        super(
            "invalid_membership_transition",
            `Membership cannot transition from ${from} to ${to}.`,
        );
    }
}

export class InvalidInvitationTransitionError
    extends MembershipError {
    public constructor(
        from:
            string,

        to:
            string,

        _invitationId?:
            string,
    ) {
        super(
            "invalid_invitation_transition",
            `Invitation cannot transition from ${from} to ${to}.`,
        );
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP COMMIT ERRORS
// -----------------------------------------------------------------------------

export class MembershipCommitFailedError
    extends MembershipError {
    public constructor(
        _cause?:
            unknown,
    ) {
        super(
            "membership_commit_failed",
            "Membership state could not be committed.",
        );
    }
}