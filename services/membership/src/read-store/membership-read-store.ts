// services/membership/src/read-store/membership-read-store.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP READ STORE
// -----------------------------------------------------------------------------
// Membership-owned query contract for canonical Membership state and
// Membership projection reads.
//
// Purpose:
//   • resolve Membership aggregates
//   • resolve Membership invitations
//   • list Membership participation by Identity or Tenant
//   • resolve the active Membership execution context
//   • keep persistence implementation details outside use cases
// -----------------------------------------------------------------------------

import type {
    InvitationState,
    MembershipContextState,
    MembershipState,
} from "../state";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface MembershipReadStore {
    /**
     * Resolve a Membership by its canonical Membership identifier.
     */
    findMembershipById(
        membershipId: string,
    ): Promise<MembershipState | null>;

    /**
     * Resolve the Membership connecting an Identity to a Tenant.
     */
    findMembership(
        identityId: string,
        tenantId: string,
    ): Promise<MembershipState | null>;

    /**
     * List all Memberships associated with an Identity.
     */
    listMembershipsByIdentity(
        identityId: string,
    ): Promise<readonly MembershipState[]>;

    /**
     * List all Memberships associated with a Tenant.
     */
    listMembershipsByTenant(
        tenantId: string,
    ): Promise<readonly MembershipState[]>;

    /**
     * Resolve an invitation by its canonical invitation identifier.
     */
    findInvitationById(
        invitationId: string,
    ): Promise<InvitationState | null>;

    /**
     * Resolve an invitation using its persisted token hash.
     */
    findInvitationByTokenHash(
        tokenHash: string,
    ): Promise<InvitationState | null>;

    /** Resolve the single live invitation for a normalized tenant/email pair. */
    findPendingInvitation(
        tenantId: string,
        invitedEmail: string,
    ): Promise<InvitationState | null>;

    /** List safe invitation state for tenant administration. */
    listInvitationsByTenant(
        tenantId: string,
        status?: import("../state").InvitationStatus,
    ): Promise<readonly InvitationState[]>;

    /** List pending invitations whose expiration deadline has elapsed. */
    listExpiredPendingInvitations(
        now: string,
        limit: number,
    ): Promise<readonly InvitationState[]>;

    /**
     * Resolve the active Membership context for an Identity.
     */
    findCurrentContext(
        identityId: string,
    ): Promise<MembershipContextState | null>;
}