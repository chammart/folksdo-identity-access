// services/access/src/api/dto/access-restriction-dto.ts
// -----------------------------------------------------------------------------
// ACCESS RESTRICTION DTO
// -----------------------------------------------------------------------------
// Public HTTP representation of an Access Operations™ restriction.
//
// Restrictions explicitly constrain authorization independently from positive
// role or permission assignments.
//
// Boundary:
//   • exposes Access-owned restriction state
//   • does not expose evaluator internals
//   • does not expose MongoDB or Folksdo Engine metadata
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// RESTRICTION CLASSIFICATION
// -----------------------------------------------------------------------------

export type AccessRestrictionScope =
    | "platform"
    | "tenant";

export type AccessRestrictionSubjectType =
    | "identity"
    | "membership"
    | "tenant";

export type ApiAccessRestrictionStatus =
    | "active"
    | "removed"
    | "expired"
    | "archived";

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION DTO
// -----------------------------------------------------------------------------

export interface AccessRestrictionDto {
    /**
     * Stable Access-owned restriction identifier.
     */
    readonly restrictionId: string;

    readonly subjectType: AccessRestrictionSubjectType;

    readonly subjectId: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly scope: AccessRestrictionScope;

    /**
     * Permission keys explicitly restricted.
     *
     * An empty set may represent a restriction affecting all protected actions,
     * depending on the canonical restriction model.
     */
    readonly permissionKeys: readonly string[];

    /**
     * Optional protected resource types constrained by the restriction.
     */
    readonly resourceTypes: readonly string[];

    readonly reasonCode: string;

    readonly description?: string;

    readonly status: ApiAccessRestrictionStatus;

    readonly createdBy: string;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly expiresAt?: string;

    readonly removedAt?: string;

    readonly expiredAt?: string;

    readonly archivedAt?: string;
}