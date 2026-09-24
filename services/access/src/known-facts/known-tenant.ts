// services/access/src/known-facts/known-tenant.ts
// -----------------------------------------------------------------------------
// KNOWN TENANT
// -----------------------------------------------------------------------------
// Access-owned local facts about a Tenant.
//
// Purpose:
//   • retain only Tenant facts required for authorization
//   • prevent synchronous Tenant Operations™ calls during authorization
//   • support deterministic Tenant lifecycle reactions
//   • block authorization inside unavailable Tenants
//
// Boundary:
//   • Tenant Operations™ owns the canonical Tenant lifecycle
//   • Access Operations™ owns this local authorization fact model
//   • this model does not duplicate Tenant profile or business configuration
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// KNOWN TENANT STATUS
// -----------------------------------------------------------------------------

export const knownTenantStatuses = [
    "provisioning",
    "active",
    "suspended",
    "archived",
] as const;

export type KnownTenantStatus =
    (typeof knownTenantStatuses)[number];

// -----------------------------------------------------------------------------
// KNOWN TENANT
// -----------------------------------------------------------------------------

export interface KnownTenant {
    readonly tenantId: string;

    readonly status: KnownTenantStatus;

    readonly createdAt?: string;

    readonly activatedAt?: string;

    readonly suspendedAt?: string;

    readonly reactivatedAt?: string;

    readonly archivedAt?: string;

    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN TENANT GUARDS
// -----------------------------------------------------------------------------

export function isKnownTenantStatus(
    value: unknown,
): value is KnownTenantStatus {
    return (
        typeof value === "string"
        && knownTenantStatuses.includes(
            value as KnownTenantStatus,
        )
    );
}

export function isKnownTenantProvisioning(
    tenant: KnownTenant,
): boolean {
    return tenant.status === "provisioning";
}

export function isKnownTenantActive(
    tenant: KnownTenant,
): boolean {
    return tenant.status === "active";
}

export function isKnownTenantSuspended(
    tenant: KnownTenant,
): boolean {
    return tenant.status === "suspended";
}

export function isKnownTenantArchived(
    tenant: KnownTenant,
): boolean {
    return tenant.status === "archived";
}

// -----------------------------------------------------------------------------
// AUTHORIZATION ELIGIBILITY
// -----------------------------------------------------------------------------

export function isKnownTenantEligibleForAccess(
    tenant: KnownTenant,
): boolean {
    return isKnownTenantActive(
        tenant,
    );
}
