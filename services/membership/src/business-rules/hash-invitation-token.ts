// services/membership/src/business-rules/hash-invitation-token.ts
// -----------------------------------------------------------------------------
// HASH INVITATION TOKEN
// -----------------------------------------------------------------------------
// Membership-owned invitation-token protection rule.
//
// Purpose:
//   • prevent raw invitation tokens from being persisted
//   • produce deterministic token hashes for invitation resolution
//   • centralize the invitation hashing algorithm
// -----------------------------------------------------------------------------

import {
    createHash,
} from "node:crypto";

// -----------------------------------------------------------------------------
// HASH INVITATION TOKEN
// -----------------------------------------------------------------------------

export function hashInvitationToken(
    value: string,
): string {
    return createHash("sha256")
        .update(value)
        .digest("hex");
}