// services/access/src/api/dto/create-restriction-request.ts
// -----------------------------------------------------------------------------
// CREATE RESTRICTION REQUEST
// -----------------------------------------------------------------------------
// Transport-safe command for creating an Access restriction.
//
// Restrictions are explicit authorization constraints. Their business
// applicability and precedence remain Access-owned behavior.
// -----------------------------------------------------------------------------

export type CreateRestrictionTargetType =
    | "membership"
    | "tenant"
    | "role"
    | "permission"
    | "resource";

export interface ApiCreateRestrictionRequest {
    readonly targetType: CreateRestrictionTargetType;

    readonly targetId: string;

    /**
     * Tenant boundary when the restriction is Tenant-scoped.
     */
    readonly tenantId?: string;

    /**
     * Optional permission keys constrained by the restriction.
     *
     * An empty or omitted collection may represent a target-wide restriction,
     * subject to canonical Access business rules.
     */
    readonly permissionKeys?: readonly string[];

    /**
     * Optional resource constraint.
     */
    readonly resource?: {
        readonly type: string;
        readonly id?: string;
    };

    readonly reasonCode: string;

    readonly description?: string;

    /**
     * Optional ISO 8601 expiration time.
     */
    readonly expiresAt?: string;
}