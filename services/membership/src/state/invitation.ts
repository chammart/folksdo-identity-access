// services/membership/src/state/invitation.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP INVITATION STATE
// -----------------------------------------------------------------------------
// Canonical Membership-owned state for tenant participation invitations.
//
// Purpose:
//   • represent an invitation to participate in a tenant
//   • preserve the invited identity boundary through email ownership
//   • retain only the invitation token hash
//   • track the complete invitation lifecycle
//   • support deterministic invitation redemption and revocation
//
// Boundary:
//   • Membership Operations™ owns invitation lifecycle state
//   • Identity Operations™ owns global identities and email verification
//   • Access Operations™ owns roles and permissions
// -----------------------------------------------------------------------------

import type { MembershipType } from "./membership";

// -----------------------------------------------------------------------------
// INVITATION STATUS
// -----------------------------------------------------------------------------

export const invitationStatuses = [
    "pending",
    "redeemed",
    "revoked",
    "expired",
] as const;

export type InvitationStatus =
    (typeof invitationStatuses)[number];

// -----------------------------------------------------------------------------
// INVITATION STATE
// -----------------------------------------------------------------------------

export interface InvitationState {
    /**
     * Stable Membership-owned invitation identifier.
     */
    readonly invitationId: string;

    /**
     * Tenant the invited person may join.
     */
    readonly targetTenantId: string;

    /**
     * Normalized email address authorized to redeem the invitation.
     */
    readonly invitedEmail: string;

    /**
     * One-way hash of the invitation token.
     *
     * The raw invitation token must never be persisted.
     */
    readonly invitationTokenHash: string;

    /**
     * Membership type granted when the invitation is redeemed.
     */
    readonly membershipType: MembershipType;

    /**
     * Current invitation lifecycle state.
     */
    readonly status: InvitationStatus;

    /**
     * Timestamp after which the invitation may no longer be redeemed.
     */
    readonly expiresAt: string;

    /**
     * Identity that created the invitation.
     */
    readonly invitedBy: string;

    /**
     * Identity that redeemed the invitation.
     *
     * Present only after successful redemption.
     */
    readonly redeemedByIdentityId?: string;

    /**
     * Timestamp when the invitation was redeemed.
     */
    readonly redeemedAt?: string;

    /**
     * Timestamp when the invitation was revoked.
     */
    readonly revokedAt?: string;

    /**
     * Timestamp when the invitation was marked expired.
     */
    readonly expiredAt?: string;

    /**
     * Timestamp when the invitation was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp when the invitation was last changed.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// INVITATION STATE GUARDS
// -----------------------------------------------------------------------------

export function isInvitationStatus(
    value: unknown,
): value is InvitationStatus {
    return (
        typeof value === "string"
        && invitationStatuses.includes(
            value as InvitationStatus,
        )
    );
}

export function isPendingInvitation(
    invitation: InvitationState,
): boolean {
    return invitation.status === "pending";
}

export function isRedeemedInvitation(
    invitation: InvitationState,
): boolean {
    return invitation.status === "redeemed";
}

export function isRevokedInvitation(
    invitation: InvitationState,
): boolean {
    return invitation.status === "revoked";
}

export function isExpiredInvitation(
    invitation: InvitationState,
): boolean {
    return invitation.status === "expired";
}