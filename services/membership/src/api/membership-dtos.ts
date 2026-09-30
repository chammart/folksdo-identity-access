// services/membership/src/api/membership-dtos.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP DTOS
// -----------------------------------------------------------------------------
// Provider-agnostic request and result contracts exposed by the public
// Membership Operations™ application API.
//
// Purpose:
//   • define stable Membership command inputs
//   • define safe Membership query and command results
//   • prevent canonical state and persistence details from leaking publicly
//   • remain independent from Fastify and other transport frameworks
// -----------------------------------------------------------------------------

import type {
    InvitationStatus,
    MembershipStatus,
    MembershipType,
} from "../state";

// -----------------------------------------------------------------------------
// MEMBERSHIP COMMAND REQUESTS
// -----------------------------------------------------------------------------

export interface CreateMembershipRequest {
    readonly identityId: string;
    readonly tenantId: string;
    readonly membershipType: MembershipType;

    /**
     * Whether the Membership should be activated immediately.
     *
     * When omitted, the use case applies its normal lifecycle policy.
     */
    readonly activate?: boolean;
}

export interface SuspendMembershipRequest {
    readonly reason: string;
}

export interface ArchiveMembershipRequest {
    readonly reason: string;
}

// -----------------------------------------------------------------------------
// INVITATION COMMAND REQUESTS
// -----------------------------------------------------------------------------

export interface InviteMemberRequest {
    readonly tenantId: string;
    readonly invitedEmail: string;
    readonly membershipType: MembershipType;

    /**
     * Optional Access-owned tenant Role to apply when the invited Membership
     * becomes active. Membership stores only the intent reference.
     */
    readonly initialRoleId?: string;

    /**
     * Optional invitation lifetime override.
     *
     * When omitted, Membership Operations™ applies its configured default.
     */
    readonly expiresInMilliseconds?: number;
}

export interface ResendInvitationRequest {
    readonly idempotencyKey: string;
    readonly expiresInMilliseconds?: number;
}

export interface BulkInvitationItemRequest {
    readonly invitedEmail: string;
    readonly membershipType: MembershipType;
    readonly initialRoleId?: string;
    readonly expiresInMilliseconds?: number;
}

export interface BulkInviteMembersRequest {
    readonly tenantId: string;
    readonly items: readonly BulkInvitationItemRequest[];
}

export interface RedeemInvitationRequest {
    readonly invitationId: string;
    readonly identityId: string;
    readonly identityEmail: string;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT REQUESTS
// -----------------------------------------------------------------------------

export interface SwitchMembershipContextRequest {
    readonly membershipId: string;
}


export interface ListMembershipsForProviderRequest {
    readonly tenantId?: string;
    readonly identityId?: string;
    readonly status?: MembershipStatus;
    readonly membershipType?: MembershipType;
    readonly createdFrom?: string;
    readonly createdTo?: string;
    readonly updatedFrom?: string;
    readonly updatedTo?: string;
    readonly offset: number;
    readonly limit: number;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP RESULTS
// -----------------------------------------------------------------------------

export interface MembershipResult {
    readonly membershipId: string;
    readonly identityId: string;
    readonly tenantId: string;
    readonly membershipType: MembershipType;
    readonly status: MembershipStatus;

    readonly createdAt: string;
    readonly updatedAt: string;

    readonly activatedAt?: string;
    readonly suspendedAt?: string;
    readonly suspensionReason?: string;
    readonly reactivatedAt?: string;
    readonly archivedAt?: string;
    readonly archiveReason?: string;
}

// -----------------------------------------------------------------------------
// INVITATION RESULTS
// -----------------------------------------------------------------------------

export interface InvitationResult {
    readonly invitationId: string;
    readonly targetTenantId: string;
    readonly invitedEmail: string;
    readonly membershipType: MembershipType;
    readonly initialRoleId?: string;
    readonly status: InvitationStatus;

    readonly createdAt: string;
    readonly updatedAt: string;
    readonly expiresAt: string;

    readonly redeemedAt?: string;
    readonly revokedAt?: string;
    readonly expiredAt?: string;
}

export interface ListTenantInvitationsRequest {
    readonly status?: InvitationStatus;
}


// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT RESULTS
// -----------------------------------------------------------------------------

export interface MembershipContextResult {
    readonly identityId: string;
    readonly activeMembershipId: string;
    readonly activeTenantId: string;
    readonly activatedAt: string;
    readonly updatedAt: string;
}