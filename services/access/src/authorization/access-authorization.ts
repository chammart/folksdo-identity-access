// services/access/src/authorization/access-authorization.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHORIZATION
// -----------------------------------------------------------------------------
// Canonical public contracts for Access authorization evaluation.
//
// Purpose:
//   • represent the authenticated authorization subject
//   • represent Tenant and resource execution scope
//   • represent the requested Permission
//   • represent optional subscription capability requirements
//   • isolate authorization from HTTP and provider concerns
//   • preserve deterministic evaluation inputs
//
// Boundary:
//   • defines the public provider-neutral authorization request
//   • reuses the deterministic evaluator request contracts
//   • contains no persistence or infrastructure concerns
//   • contains no HTTP, Fastify, BetterAuth, or repository dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

import type {
    AuthorizationEvaluationRequest,
    AuthorizationEvaluationResource,
    AuthorizationEvaluationSubject,
} from "./authorization-evaluator";

// -----------------------------------------------------------------------------
// AUTHORIZATION SUBJECT
// -----------------------------------------------------------------------------

export interface AccessAuthorizationSubject
    extends AuthorizationEvaluationSubject {
    /**
     * Global Identity participating through Membership.
     *
     * Identity is contextual information only.
     * Membership remains the canonical authorization subject.
     */
    readonly identityId: string;
}

// -----------------------------------------------------------------------------
// RESOURCE SCOPE
// -----------------------------------------------------------------------------

export interface AccessAuthorizationResource
    extends AuthorizationEvaluationResource { }

// -----------------------------------------------------------------------------
// AUTHORIZATION REQUEST
// -----------------------------------------------------------------------------

export interface AccessAuthorizationRequest
    extends Omit<
        AuthorizationEvaluationRequest,
        "subject"
        | "permission"
        | "resource"
    > {
    /**
     * Authenticated Membership authorization subject.
     */
    readonly subject: AccessAuthorizationSubject;

    /**
     * Requested business Permission.
     */
    readonly permission: AccessPermissionRequest;

    /**
     * Optional protected resource scope.
     */
    readonly resource?: AccessAuthorizationResource;

    /**
     * Optional subscription capability required by the protected action.
     */
    readonly requiredSubscriptionCapability?: string;

    /**
     * Current UTC timestamp used for deterministic lifecycle evaluation.
     */
    readonly now: string;
}