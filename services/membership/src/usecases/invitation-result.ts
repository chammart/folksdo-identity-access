// Safe invitation mapping. Token hashes and raw tokens are never returned.
import type { InvitationResult } from "../api";
import type { InvitationState } from "../state";
export function toInvitationResult(invitation: InvitationState): InvitationResult {
    return {
        invitationId: invitation.invitationId,
        targetTenantId: invitation.targetTenantId,
        invitedEmail: invitation.invitedEmail,
        membershipType: invitation.membershipType,
        status: invitation.status,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
        expiresAt: invitation.expiresAt,
        redeemedAt: invitation.redeemedAt,
        revokedAt: invitation.revokedAt,
        expiredAt: invitation.expiredAt,
    };
}
