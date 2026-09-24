// services/membership/src/business-rules/normalize-invitation-email.ts
// -----------------------------------------------------------------------------
// NORMALIZE INVITATION EMAIL
// -----------------------------------------------------------------------------
// Pure Membership domain rule.
//
// Purpose:
//   • normalize invitation email addresses consistently
//   • support deterministic invitation lookup and comparison
//   • avoid infrastructure dependencies
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// NORMALIZE INVITATION EMAIL
// -----------------------------------------------------------------------------

export function normalizeInvitationEmail(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase();
}