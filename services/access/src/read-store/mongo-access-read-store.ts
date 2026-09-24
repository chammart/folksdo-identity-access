// services/access/src/read-store/mongo-access-read-store.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS READ STORE
// -----------------------------------------------------------------------------
// MongoDB implementation façade for the Access read-store contract.
//
// Purpose:
//   • implement the provider-neutral Access query read-store contract
//   • compose focused MongoDB read-store modules
//   • expose canonical Access state and persisted known facts
//   • preserve deterministic ordering for all list operations
//   • preserve bounded cursor-based pagination
//   • preserve optimized authorization-state lookup
//
// Boundary:
//   • MongoDB implementation only
//   • contains read-store orchestration only
//   • contains no pagination implementation
//   • contains no reusable filter implementation
//   • contains no authorization evaluation
//   • contains no index definitions
//   • contains no business rules
//
// Internal composition:
//   • mongo-access-collections.ts owns typed collection resolution
//   • mongo-access-filters.ts owns reusable query filters
//   • mongo-access-sorts.ts owns deterministic sort definitions
//   • mongo-access-pagination.ts owns cursor pagination
//   • mongo-access-authorization.ts owns authorization-state loading
//   • mongo-access-indexes.ts owns MongoDB index initialization
// -----------------------------------------------------------------------------

import type {
    Db,
    Filter,
} from "mongodb";

import type {
    RoleState,
} from "../state";

import type {
    AccessQueryReadStore,
    ListKnownMembershipsPageInput,
    ListPermissionAssignmentsPageInput,
    ListPermissionsPageInput,
    ListPoliciesPageInput,
    ListRestrictionsPageInput,
    ListRoleAssignmentsPageInput,
    ListRolesPageInput,
} from "./access-read-store";

import {
    accessRestrictionSort,
    assignmentSort,
    authorizationPolicySort,
    createKnownMembershipFilter,
    createMongoAccessCollections,
    createPermissionAssignmentFilter,
    createPolicyScopeFilter,
    createRestrictionScopeFilter,
    createRoleAssignmentFilter,
    createRoleScopeFilter,
    ensureMongoAccessIndexes,
    knownMembershipSort,
    loadMongoAuthorizationState,
    permissionSort,
    readAccessRestrictionPage,
    readAuthorizationPolicyPage,
    readKnownMembershipPage,
    readPermissionAssignmentPage,
    readPermissionPage,
    readRoleAssignmentPage,
    readRolePage,
    roleSort,
} from "./mongo";

import type {
    MongoAccessCollectionNames,
} from "./mongo";

// -----------------------------------------------------------------------------
// PUBLIC COLLECTION CONTRACT
// -----------------------------------------------------------------------------

/**
 * Re-export the canonical Access collection-name contract.
 *
 * Consumers may import MongoAccessCollectionNames from this
 * module while MongoDB collection resolution remains implemented inside the
 * focused collections module.
 */
export type {
    MongoAccessCollectionNames,
} from "./mongo";

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateMongoAccessReadStoreInput {

    /**
     * MongoDB database containing Access-owned state and known-fact
     * collections.
     */
    readonly database:
    Db;

    /**
     * Physical collection names used by Access Operations™.
     */
    readonly collections:
    MongoAccessCollectionNames;
}

// -----------------------------------------------------------------------------
// UNIQUE IDENTIFIER NORMALIZATION
// -----------------------------------------------------------------------------

/**
 * Removes duplicate identifiers while preserving the caller-provided order.
 *
 * Empty identifier collections are handled before querying MongoDB so the
 * persistence provider never receives an unnecessary `$in: []` query.
 */
function resolveUniqueIdentifiers(
    identifiers: readonly string[],
): readonly string[] {
    return [
        ...new Set(
            identifiers,
        ),
    ];
}

// -----------------------------------------------------------------------------
// MONGO READ STORE
// -----------------------------------------------------------------------------

/**
 * Creates the MongoDB implementation of the Access read-store contract.
 *
 * This factory is intentionally a thin orchestration boundary. Query mechanics
 * shared across read operations are delegated to focused MongoDB modules.
 */
export function createMongoAccessReadStore(
    input: CreateMongoAccessReadStoreInput,
): AccessQueryReadStore {
    const collections =
        createMongoAccessCollections({
            database:
                input.database,

            collections:
                input.collections,
        });

    const {
        permissions,
        roles,
        roleAssignments,
        permissionAssignments,
        policies,
        restrictions,
        knownIdentities,
        knownMemberships,
        knownTenants,
        knownSubscriptionCapabilities,
    } = collections;

    return {
        // ---------------------------------------------------------------------
        // PERMISSIONS
        // ---------------------------------------------------------------------

        findPermissionById: async (
            permissionId,
        ) =>
            permissions.findOne({
                permissionId,
            }),

        findPermissionByKey: async (
            service,
            resource,
            action,
        ) =>
            permissions.findOne({
                service,
                resource,
                action,
            }),

        findPermissionsByIds: async (
            permissionIds,
        ) => {
            const uniquePermissionIds =
                resolveUniqueIdentifiers(
                    permissionIds,
                );

            if (
                uniquePermissionIds.length === 0
            ) {
                return [];
            }

            return permissions
                .find({
                    permissionId: {
                        $in:
                            uniquePermissionIds,
                    },
                })
                .sort({
                    permissionId:
                        1,
                })
                .toArray();
        },

        listPermissions: async () =>
            permissions
                .find({})
                .sort(
                    permissionSort,
                )
                .toArray(),

        listPermissionsPage: async (
            page: ListPermissionsPageInput = {},
        ) =>
            readPermissionPage({
                collection:
                    permissions,

                filter:
                    {},

                sort:
                    permissionSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // ROLES
        // ---------------------------------------------------------------------

        findRoleById: async (
            roleId,
        ) =>
            roles.findOne({
                roleId,
            }),

        findRoleByName: async (
            name,
            tenantId,
        ) => {
            const filter:
                Filter<RoleState> =
                tenantId === undefined
                    ? {
                        name,

                        tenantId: {
                            $exists:
                                false,
                        },
                    }
                    : {
                        name,
                        tenantId,
                    };

            return roles.findOne(
                filter,
            );
        },

        findRolesByIds: async (
            roleIds,
        ) => {
            const uniqueRoleIds =
                resolveUniqueIdentifiers(
                    roleIds,
                );

            if (
                uniqueRoleIds.length === 0
            ) {
                return [];
            }

            return roles
                .find({
                    roleId: {
                        $in:
                            uniqueRoleIds,
                    },
                })
                .sort({
                    roleId:
                        1,
                })
                .toArray();
        },

        listRoles: async (
            tenantId,
        ) =>
            roles
                .find(
                    createRoleScopeFilter(
                        tenantId,
                    ),
                )
                .sort(
                    roleSort,
                )
                .toArray(),

        listRolesPage: async (
            page: ListRolesPageInput = {},
        ) =>
            readRolePage({
                collection:
                    roles,

                filter:
                    createRoleScopeFilter(
                        page.tenantId,
                    ),

                sort:
                    roleSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // ROLE ASSIGNMENTS
        // ---------------------------------------------------------------------

        findRoleAssignmentById: async (
            assignmentId,
        ) =>
            roleAssignments.findOne({
                assignmentId,
            }),

        listRoleAssignments: async (
            membershipId,
            identityId,
        ) =>
            roleAssignments
                .find(
                    createRoleAssignmentFilter(
                        membershipId,
                        identityId,
                    ),
                )
                .sort(
                    assignmentSort,
                )
                .toArray(),

        listRoleAssignmentsPage: async (
            page: ListRoleAssignmentsPageInput = {},
        ) =>
            readRoleAssignmentPage({
                collection:
                    roleAssignments,

                filter:
                    createRoleAssignmentFilter(
                        page.membershipId,
                        page.identityId,
                    ),

                sort:
                    assignmentSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // PERMISSION ASSIGNMENTS
        // ---------------------------------------------------------------------

        findPermissionAssignmentById: async (
            assignmentId,
        ) =>
            permissionAssignments.findOne({
                assignmentId,
            }),

        listPermissionAssignments: async (
            membershipId,
            identityId,
        ) =>
            permissionAssignments
                .find(
                    createPermissionAssignmentFilter(
                        membershipId,
                        identityId,
                    ),
                )
                .sort(
                    assignmentSort,
                )
                .toArray(),

        listPermissionAssignmentsPage: async (
            page: ListPermissionAssignmentsPageInput = {},
        ) =>
            readPermissionAssignmentPage({
                collection:
                    permissionAssignments,

                filter:
                    createPermissionAssignmentFilter(
                        page.membershipId,
                        page.identityId,
                    ),

                sort:
                    assignmentSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // AUTHORIZATION POLICIES
        // ---------------------------------------------------------------------

        findPolicyById: async (
            policyId,
        ) =>
            policies.findOne({
                policyId,
            }),

        listPolicies: async (
            tenantId,
        ) =>
            policies
                .find(
                    createPolicyScopeFilter(
                        tenantId,
                    ),
                )
                .sort(
                    authorizationPolicySort,
                )
                .toArray(),

        listPoliciesPage: async (
            page: ListPoliciesPageInput = {},
        ) =>
            readAuthorizationPolicyPage({
                collection:
                    policies,

                filter:
                    createPolicyScopeFilter(
                        page.tenantId,
                    ),

                sort:
                    authorizationPolicySort,

                page,
            }),

        // ---------------------------------------------------------------------
        // ACCESS RESTRICTIONS
        // ---------------------------------------------------------------------

        findRestrictionById: async (
            restrictionId,
        ) =>
            restrictions.findOne({
                restrictionId,
            }),

        listRestrictions: async (
            tenantId,
        ) =>
            restrictions
                .find(
                    createRestrictionScopeFilter(
                        tenantId,
                    ),
                )
                .sort(
                    accessRestrictionSort,
                )
                .toArray(),

        listRestrictionsPage: async (
            page: ListRestrictionsPageInput = {},
        ) =>
            readAccessRestrictionPage({
                collection:
                    restrictions,

                filter:
                    createRestrictionScopeFilter(
                        page.tenantId,
                    ),

                sort:
                    accessRestrictionSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // KNOWN IDENTITIES
        // ---------------------------------------------------------------------

        findKnownIdentity: async (
            identityId,
        ) =>
            knownIdentities.findOne({
                identityId,
            }),

        findKnownTenant: async (
            tenantId,
        ) =>
            knownTenants.findOne({ tenantId }),

        findKnownSubscriptionCapabilities: async (
            tenantId,
        ) =>
            knownSubscriptionCapabilities.findOne({ tenantId }),

        // ---------------------------------------------------------------------
        // KNOWN MEMBERSHIPS
        // ---------------------------------------------------------------------

        findKnownMembership: async (
            membershipId,
        ) =>
            knownMemberships.findOne({
                membershipId,
            }),

        listKnownMemberships: async (
            identityId,
            tenantId,
        ) =>
            knownMemberships
                .find(
                    createKnownMembershipFilter(
                        identityId,
                        tenantId,
                    ),
                )
                .sort(
                    knownMembershipSort,
                )
                .toArray(),

        listKnownMembershipsPage: async (
            page: ListKnownMembershipsPageInput = {},
        ) =>
            readKnownMembershipPage({
                collection:
                    knownMemberships,

                filter:
                    createKnownMembershipFilter(
                        page.identityId,
                        page.tenantId,
                    ),

                sort:
                    knownMembershipSort,

                page,
            }),

        // ---------------------------------------------------------------------
        // AUTHORIZATION LOOKUP
        // ---------------------------------------------------------------------

        loadAuthorizationState: async (
            lookup,
        ) =>
            loadMongoAuthorizationState({
                collections,
                lookup,
            }),
    };
}

// -----------------------------------------------------------------------------
// INDEX INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Ensures every MongoDB index required by Access Operations™ exists.
 *
 * The public function name is preserved for backward compatibility while index
 * definitions and creation behavior remain isolated inside the MongoDB indexes
 * module.
 */
export async function ensureAccessIndexes(
    input: CreateMongoAccessReadStoreInput,
): Promise<void> {
    const collections =
        createMongoAccessCollections({
            database:
                input.database,

            collections:
                input.collections,
        });

    await ensureMongoAccessIndexes(
        collections,
    );
}