// services/access/src/state/permission.ts
// -----------------------------------------------------------------------------
// ACCESS PERMISSION STATE
// -----------------------------------------------------------------------------
// Canonical Access-owned state for protected business actions.
//
// Purpose:
//   • represent a protected business action
//   • provide stable authorization identifiers
//   • preserve Permission ownership by business capability
//   • support deterministic Permission discovery
//   • provide immutable Permission Catalog definitions
//
// Boundary:
//   • business capabilities define their protected actions
//   • Access Operations™ owns the canonical Permission Catalog
//   • tenants may compose Permissions into Roles
//   • tenants may not create or redefine Permission definitions
//   • Permission definitions remain immutable after registration
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PERMISSION CLASSIFICATION
// -----------------------------------------------------------------------------

export type PermissionClassification = string;

// -----------------------------------------------------------------------------
// PERMISSION STATE
// -----------------------------------------------------------------------------

export interface PermissionState {
    /**
     * Stable Access-owned Permission identifier.
     *
     * Permission identifiers must never be repurposed.
     */
    readonly permissionId: string;

    /**
     * Business service that defines the protected action.
     *
     * Example:
     * membership
     */
    readonly service: string;

    /**
     * Protected business resource.
     *
     * Example:
     * member
     */
    readonly resource: string;

    /**
     * Protected action performed against the resource.
     *
     * Example:
     * invite
     */
    readonly action: string;

    /**
     * Human-readable Permission name.
     */
    readonly displayName: string;

    /**
     * Human-readable explanation of the protected action.
     */
    readonly description: string;

    /**
     * Business-defined Permission classification.
     *
     * Classification values are defined by the Permission registration
     * boundary and must remain stable after registration.
     */
    readonly classification: PermissionClassification;

    /**
     * Timestamp when the Permission was registered.
     */
    readonly createdAt: string;
}