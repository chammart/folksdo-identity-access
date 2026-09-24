// services/access/src/runtime/indexes/access-index-definitions.ts
// -----------------------------------------------------------------------------
// ACCESS INDEX DEFINITIONS
// -----------------------------------------------------------------------------
// Canonical persistence index definitions for Access Operations™.
//
// Purpose:
//   • define indexes required by Access-owned state and known-fact collections
//   • centralize uniqueness, lookup and expiration-query requirements
//   • keep index declarations independent from a concrete database driver
//   • support deterministic runtime readiness and infrastructure provisioning
//
// Boundary:
//   • contains declarative index metadata only
//   • does not connect to MongoDB
//   • does not create or remove indexes
//   • does not contain application or business logic
// -----------------------------------------------------------------------------

import type {
    AccessCollections,
} from "../../usecases";

// -----------------------------------------------------------------------------
// INDEX KEY CONTRACTS
// -----------------------------------------------------------------------------

export type AccessIndexDirection =
    | 1
    | -1
    | "text";

export type AccessIndexKey =
    Readonly<Record<string, AccessIndexDirection>>;

// -----------------------------------------------------------------------------
// PARTIAL FILTER CONTRACTS
// -----------------------------------------------------------------------------

export type AccessIndexFilterValue =
    | string
    | number
    | boolean
    | null
    | Readonly<Record<string, unknown>>;

export type AccessIndexPartialFilter =
    Readonly<Record<string, AccessIndexFilterValue>>;

// -----------------------------------------------------------------------------
// INDEX DEFINITION
// -----------------------------------------------------------------------------

export interface AccessIndexDefinition {
    /**
     * Access collection receiving the index.
     */
    readonly collection:
    keyof AccessCollections;

    /**
     * Stable database index name.
     */
    readonly name:
    string;

    /**
     * Ordered index key definition.
     */
    readonly key:
    AccessIndexKey;

    /**
     * Whether the index enforces uniqueness.
     */
    readonly unique?:
    boolean;

    /**
     * Whether documents lacking indexed values are omitted.
     */
    readonly sparse?:
    boolean;

    /**
     * Optional partial-filter expression.
     */
    readonly partialFilterExpression?:
    AccessIndexPartialFilter;

    /**
     * Optional TTL duration.
     *
     * Access currently uses scheduled lifecycle workers rather than automatic
     * TTL deletion, so canonical indexes do not set this value. It remains in
     * the contract for infrastructure compatibility.
     */
    readonly expireAfterSeconds?:
    number;
}

// -----------------------------------------------------------------------------
// PERMISSION INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_PERMISSION_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "permissions",

            name:
                "access_permissions_service_resource_action_unique",

            key: {
                service:
                    1,

                resource:
                    1,

                action:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "permissions",

            name:
                "access_permissions_lifecycle_status",

            key: {
                lifecycleStatus:
                    1,

                service:
                    1,

                resource:
                    1,

                action:
                    1,
            },
        },
        {
            collection:
                "permissions",

            name:
                "access_permissions_classification",

            key: {
                classification:
                    1,

                lifecycleStatus:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// ROLE INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_ROLE_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "roles",

            name:
                "access_roles_global_type_name_unique",

            key: {
                roleType:
                    1,

                name:
                    1,
            },

            unique:
                true,

            /**
             * Global roles are represented by the platform and system role
             * families. Filtering by roleType avoids the unsupported
             * `tenantId: { $exists: false }` partial-index expression.
             */
            partialFilterExpression: {
                roleType: {
                    $in: [
                        "platform",
                        "system",
                    ],
                },
            },
        },
        {
            collection:
                "roles",

            name:
                "access_roles_tenant_name_unique",

            key: {
                tenantId:
                    1,

                name:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                tenantId: {
                    $type:
                        "string",
                },
            },
        },
        {
            collection:
                "roles",

            name:
                "access_roles_type_lifecycle_status",

            key: {
                roleType:
                    1,

                lifecycleStatus:
                    1,
            },
        },
        {
            collection:
                "roles",

            name:
                "access_roles_tenant_lifecycle_status",

            key: {
                tenantId:
                    1,

                lifecycleStatus:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_ROLE_ASSIGNMENT_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "roleAssignments",

            name:
                "access_role_assignments_membership_role_tenant_unique",

            key: {
                membershipId:
                    1,

                roleId:
                    1,

                tenantId:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "roleAssignments",

            name:
                "access_role_assignments_membership_status",

            key: {
                membershipId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "roleAssignments",

            name:
                "access_role_assignments_tenant_status",

            key: {
                tenantId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "roleAssignments",

            name:
                "access_role_assignments_role_status",

            key: {
                roleId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "roleAssignments",

            name:
                "access_role_assignments_status_expires_at",

            key: {
                status:
                    1,

                expiresAt:
                    1,
            },

            partialFilterExpression: {
                expiresAt: {
                    $type:
                        "date",
                },
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_PERMISSION_ASSIGNMENT_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "permissionAssignments",

            name:
                "access_permission_assignments_subject_permission_scope_unique",

            key: {
                membershipId:
                    1,

                permissionId:
                    1,

                tenantId:
                    1,

                scope:
                    1,

                resourceId:
                    1,

                assignmentType:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "permissionAssignments",

            name:
                "access_permission_assignments_membership_status",

            key: {
                membershipId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "permissionAssignments",

            name:
                "access_permission_assignments_tenant_status",

            key: {
                tenantId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "permissionAssignments",

            name:
                "access_permission_assignments_permission_status",

            key: {
                permissionId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "permissionAssignments",

            name:
                "access_permission_assignments_status_expires_at",

            key: {
                status:
                    1,

                expiresAt:
                    1,
            },

            partialFilterExpression: {
                expiresAt: {
                    $type:
                        "date",
                },
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_AUTHORIZATION_POLICY_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "authorizationPolicies",

            name:
                "access_authorization_policies_platform_name_unique",

            key: {
                scope:
                    1,

                name:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                scope:
                    "platform",
            },
        },
        {
            collection:
                "authorizationPolicies",

            name:
                "access_authorization_policies_tenant_name_unique",

            key: {
                tenantId:
                    1,

                name:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                tenantId: {
                    $type:
                        "string",
                },
            },
        },
        {
            collection:
                "authorizationPolicies",

            name:
                "access_authorization_policies_scope_lifecycle_status",

            key: {
                scope:
                    1,

                lifecycleStatus:
                    1,
            },
        },
        {
            collection:
                "authorizationPolicies",

            name:
                "access_authorization_policies_tenant_lifecycle_status",

            key: {
                tenantId:
                    1,

                lifecycleStatus:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_RESTRICTION_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "accessRestrictions",

            name:
                "access_restrictions_target_status",

            key: {
                targetType:
                    1,

                targetId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "accessRestrictions",

            name:
                "access_restrictions_tenant_status",

            key: {
                tenantId:
                    1,

                status:
                    1,
            },
        },
        {
            collection:
                "accessRestrictions",

            name:
                "access_restrictions_status_expires_at",

            key: {
                status:
                    1,

                expiresAt:
                    1,
            },

            partialFilterExpression: {
                expiresAt: {
                    $type:
                        "date",
                },
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// KNOWN IDENTITY INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_KNOWN_IDENTITY_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "knownIdentities",

            name:
                "access_known_identities_identity_id_unique",

            key: {
                identityId:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "knownIdentities",

            name:
                "access_known_identities_status",

            key: {
                status:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_KNOWN_MEMBERSHIP_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "knownMemberships",

            name:
                "access_known_memberships_membership_id_unique",

            key: {
                membershipId:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "knownMemberships",

            name:
                "access_known_memberships_identity_tenant",

            key: {
                identityId:
                    1,

                tenantId:
                    1,
            },
        },
        {
            collection:
                "knownMemberships",

            name:
                "access_known_memberships_tenant_status",

            key: {
                tenantId:
                    1,

                status:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// KNOWN TENANT INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_KNOWN_TENANT_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "knownTenants",

            name:
                "access_known_tenants_tenant_id_unique",

            key: {
                tenantId:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "knownTenants",

            name:
                "access_known_tenants_status",

            key: {
                status:
                    1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION CAPABILITY INDEXES
// -----------------------------------------------------------------------------

export const ACCESS_KNOWN_SUBSCRIPTION_CAPABILITY_INDEXES:
    readonly AccessIndexDefinition[] = [
        {
            collection:
                "knownSubscriptionCapabilities",

            name:
                "access_known_subscription_capabilities_tenant_id_unique",

            key: {
                tenantId:
                    1,
            },

            unique:
                true,
        },
        {
            collection:
                "knownSubscriptionCapabilities",

            name:
                "access_known_subscription_capabilities_updated_at",

            key: {
                updatedAt:
                    -1,
            },
        },
    ] as const;

// -----------------------------------------------------------------------------
// COMPLETE INDEX CATALOG
// -----------------------------------------------------------------------------

export const ACCESS_INDEX_DEFINITIONS:
    readonly AccessIndexDefinition[] = [
        ...ACCESS_PERMISSION_INDEXES,
        ...ACCESS_ROLE_INDEXES,
        ...ACCESS_ROLE_ASSIGNMENT_INDEXES,
        ...ACCESS_PERMISSION_ASSIGNMENT_INDEXES,
        ...ACCESS_AUTHORIZATION_POLICY_INDEXES,
        ...ACCESS_RESTRICTION_INDEXES,
        ...ACCESS_KNOWN_IDENTITY_INDEXES,
        ...ACCESS_KNOWN_MEMBERSHIP_INDEXES,
        ...ACCESS_KNOWN_TENANT_INDEXES,
        ...ACCESS_KNOWN_SUBSCRIPTION_CAPABILITY_INDEXES,
    ] as const;

// -----------------------------------------------------------------------------
// INDEX LOOKUPS
// -----------------------------------------------------------------------------

export function getAccessIndexDefinitionsForCollection(
    collection:
        keyof AccessCollections,
): readonly AccessIndexDefinition[] {
    return ACCESS_INDEX_DEFINITIONS.filter(
        (
            definition,
        ) =>
            definition.collection === collection,
    );
}

export function findAccessIndexDefinition(
    name:
        string,
): AccessIndexDefinition | undefined {
    return ACCESS_INDEX_DEFINITIONS.find(
        (
            definition,
        ) =>
            definition.name === name,
    );
}