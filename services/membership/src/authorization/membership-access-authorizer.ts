// services/membership/src/authorization/membership-access-authorizer.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP ACCESS AUTHORIZER
// -----------------------------------------------------------------------------
// Provider-neutral authorization contract required by Membership Operations™.
//
// Purpose:
//   • describe the Access authorization decision Membership requires
//   • keep Membership independent from Access Operations™ implementation
//   • preserve service extraction boundaries
//   • provide a stable host-composition seam for authorization
//
// Boundary:
//   • Membership owns which business Permission protects an operation
//   • Access Operations™ owns the final authorization decision
//   • the host translates this contract to the public Access API
//   • this contract contains no Access DTOs, persistence, or implementation
//   • RuntimeContext.permissions is not an authorization authority here
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipPermission,
} from "./membership-permissions";

// -----------------------------------------------------------------------------
// RESOURCE TYPE
// -----------------------------------------------------------------------------

export const membershipAuthorizationResourceTypes = [
    "member",
    "invitation",
    "context",
] as const;

export type MembershipAuthorizationResourceType =
    (typeof membershipAuthorizationResourceTypes)[number];

// -----------------------------------------------------------------------------
// RESOURCE
// -----------------------------------------------------------------------------

export interface MembershipAuthorizationResource {
    /**
     * Membership-owned resource category being protected.
     *
     * The host adapter translates this value to the Access public API
     * resource contract.
     */
    readonly type:
    MembershipAuthorizationResourceType;

    /**
     * Optional canonical resource identifier.
     *
     * Collection-level operations may intentionally omit an identifier.
     */
    readonly id?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION REQUEST
// -----------------------------------------------------------------------------

export interface MembershipAccessAuthorizationRequest {
    /**
     * Canonical Membership business Permission required by the operation.
     *
     * Example:
     *   membership.member.invite
     */
    readonly permission:
    MembershipPermission;

    /**
     * Canonical Tenant in which authorization must be evaluated.
     */
    readonly tenantId:
    string;

    /**
     * Active Membership context through which the actor is operating.
     *
     * Administrative Membership operations require a resolved active
     * Membership before Access authorization is requested.
     */
    readonly membershipId:
    string;

    /**
     * Protected Membership resource.
     */
    readonly resource:
    MembershipAuthorizationResource;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION
// -----------------------------------------------------------------------------

export interface MembershipAccessAuthorizationDecision {
    /**
     * Final authorization result returned by the authorization provider.
     *
     * Membership consumes this result but does not reconstruct how it was
     * derived.
     */
    readonly allowed:
    boolean;

    /**
     * Stable authorization decision identifier used for audit correlation.
     */
    readonly decisionId:
    string;

    /**
     * Stable machine-readable reason supplied by the authorization provider.
     */
    readonly reasonCode:
    string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION PORT
// -----------------------------------------------------------------------------

export interface MembershipAccessAuthorizer {
    /**
     * Obtain the final authorization decision for a protected Membership
     * business operation.
     *
     * RuntimeContext supplies the authenticated actor and correlation
     * metadata. Its permissions collection must not be interpreted by
     * Membership as authorization authority.
     */
    authorize(
        request:
            MembershipAccessAuthorizationRequest,

        context:
            RuntimeContext,
    ): Promise<
        MembershipAccessAuthorizationDecision
    >;
}