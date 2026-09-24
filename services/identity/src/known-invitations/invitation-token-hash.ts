// services/identity/src/known-invitations/invitation-token-hash.ts
// -----------------------------------------------------------------------------
// INVITATION TOKEN HASH
// -----------------------------------------------------------------------------
// Deterministic invitation token hashing used by Identity's local invitation
// verifier.
//
// Purpose:
//   • avoid storing or querying raw invitation tokens
//   • match Membership-published token hashes
//   • keep token verification local and service-independent
//
// This is not token generation.
// Membership owns invitation token issuance.
// -----------------------------------------------------------------------------

import { createHash } from "node:crypto";

export function hashInvitationToken(token: string): string {
    return createHash("sha256")
        .update(normalizeInvitationToken(token))
        .digest("hex");
}

export function normalizeInvitationToken(token: string): string {
    return token.trim();
}
