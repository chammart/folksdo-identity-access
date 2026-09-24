// services/access/src/known-facts/known-identity.ts
// -----------------------------------------------------------------------------
// KNOWN IDENTITY
// -----------------------------------------------------------------------------
// Access-owned local facts about a global Identity.
//
// Purpose:
//   • retain only Identity facts required for authorization
//   • prevent synchronous Identity Operations™ calls during authorization
//   • support deterministic Identity lifecycle reactions
//   • preserve suspension and archival provenance
//
// Boundary:
//   • Identity Operations™ owns the canonical global Identity
//   • Access Operations™ owns this local authorization fact model
//   • this model must not duplicate credentials, sessions, or profile data
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// KNOWN IDENTITY STATUS
// -----------------------------------------------------------------------------

export const knownIdentityStatuses = [
    "active",
    "disabled",
    "archived",
] as const;

export type KnownIdentityStatus =
    (typeof knownIdentityStatuses)[number];

// -----------------------------------------------------------------------------
// KNOWN IDENTITY
// -----------------------------------------------------------------------------

export interface KnownIdentity {
    /**
     * Stable Identity Operations™ identifier.
     */
    readonly identityId: string;

    /**
     * Current Identity lifecycle fact known by Access Operations™.
     */
    readonly status: KnownIdentityStatus;

    /**
     * Timestamp when the Identity became active.
     */
    readonly activatedAt?: string;

    /**
     * Timestamp when the Identity was disabled.
     */
    readonly disabledAt?: string;

    /**
     * Timestamp when the Identity was archived.
     */
    readonly archivedAt?: string;

    /**
     * Timestamp when the Identity was restored.
     */
    readonly restoredAt?: string;

    /**
     * Timestamp when Access last updated this local fact.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN IDENTITY GUARDS
// -----------------------------------------------------------------------------

export function isKnownIdentityStatus(
    value: unknown,
): value is KnownIdentityStatus {
    return (
        typeof value === "string"
        && knownIdentityStatuses.includes(
            value as KnownIdentityStatus,
        )
    );
}

export function isKnownIdentityActive(
    identity: KnownIdentity,
): boolean {
    return identity.status === "active";
}

export function isKnownIdentityDisabled(
    identity: KnownIdentity,
): boolean {
    return identity.status === "disabled";
}

export function isKnownIdentityArchived(
    identity: KnownIdentity,
): boolean {
    return identity.status === "archived";
}

// -----------------------------------------------------------------------------
// AUTHORIZATION ELIGIBILITY
// -----------------------------------------------------------------------------

export function isKnownIdentityEligibleForAccess(
    identity: KnownIdentity,
): boolean {
    return isKnownIdentityActive(identity);
}