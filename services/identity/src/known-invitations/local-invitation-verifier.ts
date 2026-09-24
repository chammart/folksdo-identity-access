// services/identity/src/known-invitations/local-invitation-verifier.ts
// -----------------------------------------------------------------------------
// LOCAL INVITATION VERIFIER
// -----------------------------------------------------------------------------
// Identity-owned verifier backed by the local known invitation read model.
//
// Purpose:
//   • verify invitation tokens without calling Membership synchronously
//   • enforce invitation status and expiration
//   • return the verified invitation facts needed by Invitation SignUp™
//
// Architecture:
//
// Membership emits invitation lifecycle events.
// Identity reactions maintain identity_known_invitations.
// Signup verifies against that local read model.
// -----------------------------------------------------------------------------

import {
    InvitationAlreadyRedeemedError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvitationRevokedError,
} from "../errors";

import type {
    InvitationVerifier,
    VerifiedInvitation,
} from "../usecases";

import {
    hashInvitationToken,
    normalizeInvitationToken,
} from "./invitation-token-hash";

import type { KnownInvitationReadStore } from "./known-invitation-read-store";

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export interface CreateLocalInvitationVerifierInput {
    readonly readStore: KnownInvitationReadStore;
}

export function createLocalInvitationVerifier(
    input: CreateLocalInvitationVerifierInput,
): InvitationVerifier {
    return {
        async verify(token: string): Promise<VerifiedInvitation> {
            const normalizedToken = normalizeInvitationToken(token);

            if (normalizedToken.length === 0) {
                throw new InvitationNotFoundError();
            }

            const invitation = await input.readStore.findByTokenHash(
                hashInvitationToken(normalizedToken),
            );

            if (!invitation) {
                throw new InvitationNotFoundError();
            }

            if (invitation.status === "expired") {
                throw new InvitationExpiredError();
            }

            if (invitation.status === "revoked") {
                throw new InvitationRevokedError();
            }

            if (invitation.status === "redeemed") {
                throw new InvitationAlreadyRedeemedError();
            }

            if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
                throw new InvitationExpiredError();
            }

            return {
                invitationId: invitation.invitationId,
                targetTenantId: invitation.targetTenantId,
                invitedEmail: invitation.invitedEmail,
            };
        },
    };
}
