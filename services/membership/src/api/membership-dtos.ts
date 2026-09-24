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
     * Optional invitation lifetime override.
     *
     * When omitted, Membership Operations™ applies its configured default.
     */
    readonly expiresInMilliseconds?: number;
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


export type ListMembershipsForProviderRequest =
    | {
        readonly tenantId: string;
        readonly identityId?: never;
    }
    | {
        readonly tenantId?: never;
        readonly identityId: string;
    };

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