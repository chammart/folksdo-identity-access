// services/membership/src/api/membership-api.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP API
// -----------------------------------------------------------------------------
// Public application boundary for Membership Operations™.
//
// Purpose:
//   • expose Membership-owned commands and queries to the host
//   • hide use-case implementation details from transport adapters
//   • accept Folksdo Runtime Context for every operation
//   • return provider-agnostic Membership results
//
// Boundary:
//   • exposes no persistence implementation details
//   • exposes no Folksdo Engine commit contracts
//   • exposes no event-backbone infrastructure
//   • contains no transport-specific request or response types
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipProviderReadSecurity,
} from "./membership-route-context";

import type {
    ArchiveMembershipRequest,
    CreateMembershipRequest,
    InvitationResult,
    InviteMemberRequest,
    ListMembershipsForProviderRequest,
    MembershipContextResult,
    MembershipResult,
    RedeemInvitationRequest,
    SuspendMembershipRequest,
    SwitchMembershipContextRequest,
} from "./membership-dtos";

// -----------------------------------------------------------------------------
// COMPOUND RESULTS
// -----------------------------------------------------------------------------

/**
 * Result returned when a new invitation is issued.
 *
 * The raw invitation token is returned only at creation time. Membership
 * persistence must retain only its hash.
 */
export interface IssuedInvitationResult
    extends InvitationResult {
    readonly invitationToken?: string;
}

/**
 * Result returned after an invitation has been redeemed successfully.
 */
export interface RedeemedInvitationResult {
    readonly invitation: InvitationResult;
    readonly membership: MembershipResult;
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export interface MembershipApi {
    // -------------------------------------------------------------------------
    // MEMBERSHIP LIFECYCLE
    // -------------------------------------------------------------------------

    createMembership(
        input: CreateMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    activateMembership(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    suspendMembership(
        membershipId: string,
        input: SuspendMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    reactivateMembership(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    archiveMembership(
        membershipId: string,
        input: ArchiveMembershipRequest,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    // -------------------------------------------------------------------------
    // INVITATION LIFECYCLE
    // -------------------------------------------------------------------------

    inviteMember(
        input: InviteMemberRequest,
        context: RuntimeContext,
    ): Promise<IssuedInvitationResult>;

    redeemInvitation(
        input: RedeemInvitationRequest,
        context: RuntimeContext,
    ): Promise<RedeemedInvitationResult>;

    revokeInvitation(
        invitationId: string,
        context: RuntimeContext,
    ): Promise<InvitationResult>;

    expireInvitation(invitationId: string, context: RuntimeContext): Promise<InvitationResult>;
    getInvitation(invitationId: string, context: RuntimeContext): Promise<InvitationResult>;
    listTenantInvitations(tenantId: string, input: import("./membership-dtos").ListTenantInvitationsRequest, context: RuntimeContext): Promise<readonly InvitationResult[]>;

    // -------------------------------------------------------------------------
    // MEMBERSHIP QUERIES
    // -------------------------------------------------------------------------

    getMembership(
        membershipId: string,
        context: RuntimeContext,
    ): Promise<MembershipResult>;

    listTenantMemberships(
        tenantId: string,
        context: RuntimeContext,
    ): Promise<readonly MembershipResult[]>;


    listMembershipsForProvider(
        input: ListMembershipsForProviderRequest,
        context: RuntimeContext,
        security: MembershipProviderReadSecurity,
    ): Promise<readonly MembershipResult[]>;

    // -------------------------------------------------------------------------
    // ACTIVE MEMBERSHIP CONTEXT
    // -------------------------------------------------------------------------

    getCurrentContext(
        identityId: string,
        context: RuntimeContext,
    ): Promise<MembershipContextResult>;

    switchMembershipContext(
        identityId: string,
        input: SwitchMembershipContextRequest,
        context: RuntimeContext,
    ): Promise<MembershipContextResult>;
}