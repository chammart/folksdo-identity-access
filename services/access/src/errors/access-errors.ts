// services/access/src/errors/access-errors.ts
// -----------------------------------------------------------------------------
// ACCESS SEMANTIC ERRORS
// -----------------------------------------------------------------------------
// Production-safe semantic errors exposed by Access Operations™.
//
// Purpose:
//   • avoid raw Error leakage across service/API boundaries
//   • preserve authorization and policy business meaning
//   • keep HTTP translation deterministic
//   • provide stable machine-readable Access error codes
//
// Boundary:
//   • represents Access-owned business and application failures
//   • remains independent from HTTP and transport concerns
//   • does not expose infrastructure implementation details
//   • preserves stable error codes across compatible releases
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ACCESS ERROR CODES
// -----------------------------------------------------------------------------

export type AccessErrorCode =
    | "permission_not_found"
    | "permission_already_exists"
    | "role_not_found"
    | "role_already_exists"
    | "role_not_active"
    | "role_assignment_not_found"
    | "role_assignment_already_exists"
    | "role_assignment_not_active"
    | "permission_assignment_not_found"
    | "permission_assignment_already_exists"
    | "permission_assignment_not_active"
    | "authorization_policy_not_found"
    | "authorization_policy_already_exists"
    | "authorization_policy_not_active"
    | "restriction_not_found"
    | "restriction_already_exists"
    | "membership_access_context_not_found"
    | "tenant_access_context_not_found"
    | "authorization_context_invalid"
    | "authorization_subject_invalid"
    | "authorization_scope_invalid"
    | "authorization_denied"
    | "administrative_authorization_denied"
    | "administrative_authorization_unavailable"
    | "invalid_role_transition"
    | "invalid_role_assignment_transition"
    | "invalid_permission_assignment_transition"
    | "invalid_authorization_policy_transition"
    | "invalid_identity_access_transition"
    | "access_commit_failed";

// -----------------------------------------------------------------------------
// BASE ACCESS ERROR
// -----------------------------------------------------------------------------

export class AccessError extends Error {
    public readonly code: AccessErrorCode;

    public constructor(
        code: AccessErrorCode,
        message: string,
    ) {
        super(message);

        this.name = new.target.name;
        this.code = code;
    }
}

// -----------------------------------------------------------------------------
// ACCESS RESOURCE ERRORS
// -----------------------------------------------------------------------------

export class PermissionNotFoundError extends AccessError {
    public constructor(_permissionId?: string) {
        super(
            "permission_not_found",
            "Permission was not found.",
        );
    }
}

export class RoleNotFoundError extends AccessError {
    public constructor(_roleId?: string) {
        super(
            "role_not_found",
            "Role was not found.",
        );
    }
}

export class RoleAssignmentNotFoundError extends AccessError {
    public constructor(_assignmentId?: string) {
        super(
            "role_assignment_not_found",
            "Role assignment was not found.",
        );
    }
}

export class PermissionAssignmentNotFoundError extends AccessError {
    public constructor(_assignmentId?: string) {
        super(
            "permission_assignment_not_found",
            "Permission assignment was not found.",
        );
    }
}

export class AuthorizationPolicyNotFoundError extends AccessError {
    public constructor(_policyId?: string) {
        super(
            "authorization_policy_not_found",
            "Authorization policy was not found.",
        );
    }
}

export class RestrictionNotFoundError extends AccessError {
    public constructor(_restrictionId?: string) {
        super(
            "restriction_not_found",
            "Access restriction was not found.",
        );
    }
}

export class MembershipAccessContextNotFoundError extends AccessError {
    public constructor(_membershipId?: string) {
        super(
            "membership_access_context_not_found",
            "Membership access context was not found.",
        );
    }
}

export class TenantAccessContextNotFoundError extends AccessError {
    public constructor(_tenantId?: string) {
        super(
            "tenant_access_context_not_found",
            "Tenant access context was not found.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS CONFLICT ERRORS
// -----------------------------------------------------------------------------

export class PermissionAlreadyExistsError extends AccessError {
    public constructor(_permissionKey?: string) {
        super(
            "permission_already_exists",
            "Permission already exists.",
        );
    }
}

export class RoleAlreadyExistsError extends AccessError {
    public constructor(
        _roleName?: string,
        _tenantId?: string,
    ) {
        super(
            "role_already_exists",
            "Role already exists.",
        );
    }
}

export class RoleAssignmentAlreadyExistsError extends AccessError {
    public constructor(
        _roleId?: string,
        _membershipId?: string,
    ) {
        super(
            "role_assignment_already_exists",
            "Role assignment already exists.",
        );
    }
}

export class PermissionAssignmentAlreadyExistsError extends AccessError {
    public constructor(
        _permissionId?: string,
        _membershipId?: string,
    ) {
        super(
            "permission_assignment_already_exists",
            "Permission assignment already exists.",
        );
    }
}

export class AuthorizationPolicyAlreadyExistsError extends AccessError {
    public constructor(
        _policyName?: string,
        _tenantId?: string,
    ) {
        super(
            "authorization_policy_already_exists",
            "Authorization policy already exists.",
        );
    }
}

export class RestrictionAlreadyExistsError extends AccessError {
    public constructor(
        _restrictionId?: string,
    ) {
        super(
            "restriction_already_exists",
            "Access restriction already exists.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS ELIGIBILITY ERRORS
// -----------------------------------------------------------------------------

export class RoleNotActiveError extends AccessError {
    public constructor(_roleId?: string) {
        super(
            "role_not_active",
            "Role is not active.",
        );
    }
}

export class RoleAssignmentNotActiveError extends AccessError {
    public constructor(_assignmentId?: string) {
        super(
            "role_assignment_not_active",
            "Role assignment is not active.",
        );
    }
}

export class PermissionAssignmentNotActiveError extends AccessError {
    public constructor(_assignmentId?: string) {
        super(
            "permission_assignment_not_active",
            "Permission assignment is not active.",
        );
    }
}

export class AuthorizationPolicyNotActiveError extends AccessError {
    public constructor(_policyId?: string) {
        super(
            "authorization_policy_not_active",
            "Authorization policy is not active.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS VALIDATION ERRORS
// -----------------------------------------------------------------------------

export class AuthorizationContextInvalidError extends AccessError {
    public constructor(_reason?: string) {
        super(
            "authorization_context_invalid",
            "Authorization context is invalid.",
        );
    }
}

export class AuthorizationSubjectInvalidError extends AccessError {
    public constructor(_reason?: string) {
        super(
            "authorization_subject_invalid",
            "Authorization subject is invalid.",
        );
    }
}

export class AuthorizationScopeInvalidError extends AccessError {
    public constructor(_reason?: string) {
        super(
            "authorization_scope_invalid",
            "Authorization scope is invalid.",
        );
    }
}

export class AuthorizationDeniedError extends AccessError {
    public constructor(
        _permissionKey?: string,
        _reason?: string,
    ) {
        super(
            "authorization_denied",
            "Authorization was denied.",
        );
    }
}

export class AccessAdministrativeAuthorizationDeniedError
    extends AccessError {
    public constructor(
        public readonly reasonCode: string,
        public readonly decisionId?: string,
    ) {
        super(
            "administrative_authorization_denied",
            "The actor is not authorized to perform this Access operation.",
        );
    }
}

export class AccessAdministrativeAuthorizationUnavailableError
    extends AccessError {
    public constructor(
        public readonly authorizationCause?: unknown,
    ) {
        super(
            "administrative_authorization_unavailable",
            "Access administrative authorization is temporarily unavailable.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS TRANSITION ERRORS
// -----------------------------------------------------------------------------

export class InvalidRoleTransitionError extends AccessError {
    public constructor(
        from: string,
        to: string,
        _roleId?: string,
    ) {
        super(
            "invalid_role_transition",
            `Role cannot transition from ${from} to ${to}.`,
        );
    }
}

export class InvalidRoleAssignmentTransitionError extends AccessError {
    public constructor(
        from: string,
        to: string,
        _assignmentId?: string,
    ) {
        super(
            "invalid_role_assignment_transition",
            `Role assignment cannot transition from ${from} to ${to}.`,
        );
    }
}

export class InvalidPermissionAssignmentTransitionError extends AccessError {
    public constructor(
        from: string,
        to: string,
        _assignmentId?: string,
    ) {
        super(
            "invalid_permission_assignment_transition",
            `Permission assignment cannot transition from ${from} to ${to}.`,
        );
    }
}

export class InvalidAuthorizationPolicyTransitionError extends AccessError {
    public constructor(
        from: string,
        to: string,
        _policyId?: string,
    ) {
        super(
            "invalid_authorization_policy_transition",
            `Authorization policy cannot transition from ${from} to ${to}.`,
        );
    }
}


export class InvalidIdentityAccessTransitionError extends AccessError {
    public constructor(
        _fromStatus?: string,
        _toStatus?: string,
        _identityId?: string,
    ) {
        super(
            "invalid_identity_access_transition",
            "Identity access lifecycle transition is invalid.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS COMMIT ERRORS
// -----------------------------------------------------------------------------

export class AccessCommitFailedError extends AccessError {
    public constructor(_cause?: unknown) {
        super(
            "access_commit_failed",
            "Access state could not be committed.",
        );
    }
}