// services/access/src/runtime/collections/access-collection-names.ts
// -----------------------------------------------------------------------------
// ACCESS COLLECTION NAMES
// -----------------------------------------------------------------------------
// Canonical persistence collection names for Access Operations™.
//
// Purpose:
//   • centralize Access-owned collection names
//   • prevent persistence identifiers from being duplicated
//   • provide stable defaults for runtime composition
//   • preserve extraction and infrastructure portability
//
// Boundary:
//   • contains no database client imports
//   • contains no index creation
//   • contains no persistence behavior
//   • remains independent from MongoDB-specific concerns
// -----------------------------------------------------------------------------

import type {
    AccessCollections,
} from "../../usecases";

// -----------------------------------------------------------------------------
// DEFAULT COLLECTION NAMES
// -----------------------------------------------------------------------------

export const ACCESS_COLLECTION_NAMES = {
    permissions:
        "access_permissions",

    roles:
        "access_roles",

    roleAssignments:
        "access_role_assignments",

    permissionAssignments:
        "access_permission_assignments",

    authorizationPolicies:
        "access_authorization_policies",

    accessRestrictions:
        "access_restrictions",

    knownIdentities:
        "access_known_identities",

    knownMemberships:
        "access_known_memberships",

    knownTenants:
        "access_known_tenants",

    knownSubscriptionCapabilities:
        "access_known_subscription_capabilities",
} as const satisfies AccessCollections;

// -----------------------------------------------------------------------------
// COLLECTION NAME TYPE
// -----------------------------------------------------------------------------

export type AccessCollectionName =
    typeof ACCESS_COLLECTION_NAMES[
    keyof typeof ACCESS_COLLECTION_NAMES
    ];

// -----------------------------------------------------------------------------
// COLLECTION KEY TYPE
// -----------------------------------------------------------------------------

export type AccessCollectionKey =
    keyof AccessCollections;

// -----------------------------------------------------------------------------
// COLLECTION NAME LIST
// -----------------------------------------------------------------------------

export const ACCESS_COLLECTION_NAME_LIST =
    Object.values(
        ACCESS_COLLECTION_NAMES,
    ) as readonly AccessCollectionName[];

// -----------------------------------------------------------------------------
// COLLECTION KEY LIST
// -----------------------------------------------------------------------------

export const ACCESS_COLLECTION_KEY_LIST =
    Object.keys(
        ACCESS_COLLECTION_NAMES,
    ) as readonly AccessCollectionKey[];

// -----------------------------------------------------------------------------
// COLLECTION NAME LOOKUP
// -----------------------------------------------------------------------------

export function getAccessCollectionName(
    key: AccessCollectionKey,
): AccessCollectionName {
    return ACCESS_COLLECTION_NAMES[
        key
    ];
}