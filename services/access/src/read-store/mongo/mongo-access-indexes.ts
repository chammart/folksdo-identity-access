// services/access/src/read-store/mongo/mongo-access-indexes.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS INDEXES
// -----------------------------------------------------------------------------
// MongoDB index management for Access Operations™ read models.
//
// Purpose:
//   • create deterministic indexes required by Access read operations
//   • support uniqueness constraints owned by Access Operations™
//   • support stable cursor pagination
//   • support authorization-state lookup performance
//   • keep MongoDB index definitions outside read-store composition
//
// Boundary:
//   • MongoDB implementation only
//   • contains no business rules
//   • contains no authorization evaluation
//   • contains no read-store query implementation
//   • contains no collection creation
//
// Index strategy:
//   • unique indexes protect canonical Access-owned identifiers
//   • compound indexes follow equality fields before sort fields
//   • pagination indexes match cursor sort order exactly
//   • partial indexes constrain uniqueness only where the domain requires it
//   • index names are explicit and stable for operational visibility
// -----------------------------------------------------------------------------

import type {
    CreateIndexesOptions,
    IndexDescription,
} from "mongodb";

import type {
    MongoAccessCollections,
} from "./mongo-access-collections";

// -----------------------------------------------------------------------------
// INDEX CREATION OPTIONS
// -----------------------------------------------------------------------------

const indexCreationOptions:
    CreateIndexesOptions = {
    maxTimeMS:
        60_000,
};

// -----------------------------------------------------------------------------
// PERMISSION INDEXES
// -----------------------------------------------------------------------------

const permissionIndexes:
    IndexDescription[] = [
        {
            name:
                "access_permission_id_unique",

            key: {
                permissionId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_permission_key_unique",

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
            name:
                "access_permission_pagination",

            key: {
                service:
                    1,

                resource:
                    1,

                action:
                    1,

                permissionId:
                    1,
            },
        },
        {
            name:
                "access_permission_lifecycle",

            key: {
                lifecycleStatus:
                    1,

                service:
                    1,

                resource:
                    1,

                action:
                    1,

                permissionId:
                    1,
            },
        },
    ];

// -----------------------------------------------------------------------------
// ROLE INDEXES
// -----------------------------------------------------------------------------

const roleIndexes:
    IndexDescription[] = [
        {
            name:
                "access_role_id_unique",

            key: {
                roleId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_role_pagination",

            key: {
                roleType:
                    1,

                name:
                    1,

                roleId:
                    1,
            },
        },
        {
            name:
                "access_role_tenant_lookup",

            key: {
                tenantId:
                    1,

                lifecycleStatus:
                    1,

                roleType:
                    1,

                name:
                    1,

                roleId:
                    1,
            },
        },
        {
            name:
                "access_role_platform_name_unique",

            key: {
                roleType:
                    1,

                name:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                roleType: {
                    $in: [
                        "platform",
                        "system",
                    ],
                },

                lifecycleStatus: {
                    $ne:
                        "archived",
                },
            },
        },
        {
            name:
                "access_role_tenant_name_unique",

            key: {
                tenantId:
                    1,

                name:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                roleType:
                    "tenant",

                tenantId: {
                    $exists:
                        true,
                },

                lifecycleStatus: {
                    $ne:
                        "archived",
                },
            },
        },
    ];

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT INDEXES
// -----------------------------------------------------------------------------

const roleAssignmentIndexes:
    IndexDescription[] = [
        {
            name:
                "access_role_assignment_id_unique",

            key: {
                assignmentId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_role_assignment_pagination",

            key: {
                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_role_assignment_membership_lookup",

            key: {
                membershipId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_role_assignment_identity_lookup",

            key: {
                identityId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_role_assignment_authorization_lookup",

            key: {
                identityId:
                    1,

                membershipId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_role_assignment_active_unique",

            key: {
                roleId:
                    1,

                identityId:
                    1,

                membershipId:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                status:
                    "active",
            },
        },
        {
            name:
                "access_role_assignment_expiration",

            key: {
                status:
                    1,

                expiresAt:
                    1,

                assignmentId:
                    1,
            },

            partialFilterExpression: {
                status:
                    "active",

                expiresAt: {
                    $exists:
                        true,
                },
            },
        },
    ];

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT INDEXES
// -----------------------------------------------------------------------------

const permissionAssignmentIndexes:
    IndexDescription[] = [
        {
            name:
                "access_permission_assignment_id_unique",

            key: {
                assignmentId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_permission_assignment_pagination",

            key: {
                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_permission_assignment_membership_lookup",

            key: {
                membershipId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_permission_assignment_identity_lookup",

            key: {
                identityId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_permission_assignment_authorization_lookup",

            key: {
                identityId:
                    1,

                membershipId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                assignmentId:
                    1,
            },
        },
        {
            name:
                "access_permission_assignment_active_unique",

            key: {
                permissionId:
                    1,

                identityId:
                    1,

                membershipId:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                status:
                    "active",
            },
        },
        {
            name:
                "access_permission_assignment_expiration",

            key: {
                status:
                    1,

                expiresAt:
                    1,

                assignmentId:
                    1,
            },

            partialFilterExpression: {
                status:
                    "active",

                expiresAt: {
                    $exists:
                        true,
                },
            },
        },
    ];

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY INDEXES
// -----------------------------------------------------------------------------

const authorizationPolicyIndexes:
    IndexDescription[] = [
        {
            name:
                "access_authorization_policy_id_unique",

            key: {
                policyId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_authorization_policy_pagination",

            key: {
                scope:
                    1,

                name:
                    1,

                version:
                    1,

                policyId:
                    1,
            },
        },
        {
            name:
                "access_authorization_policy_tenant_lookup",

            key: {
                tenantId:
                    1,

                lifecycleStatus:
                    1,

                scope:
                    1,

                name:
                    1,

                version:
                    1,

                policyId:
                    1,
            },
        },
        {
            name:
                "access_authorization_policy_platform_lookup",

            key: {
                lifecycleStatus:
                    1,

                scope:
                    1,

                name:
                    1,

                version:
                    1,

                policyId:
                    1,
            },

            partialFilterExpression: {
                tenantId: {
                    $exists:
                        false,
                },
            },
        },
        {
            name:
                "access_authorization_policy_tenant_name_version_unique",

            key: {
                tenantId:
                    1,

                name:
                    1,

                version:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                tenantId: {
                    $exists:
                        true,
                },
            },
        },
        {
            name:
                "access_authorization_policy_platform_name_version_unique",

            key: {
                name:
                    1,

                version:
                    1,
            },

            unique:
                true,

            partialFilterExpression: {
                tenantId: {
                    $exists:
                        false,
                },
            },
        },
    ];

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION INDEXES
// -----------------------------------------------------------------------------

const accessRestrictionIndexes:
    IndexDescription[] = [
        {
            name:
                "access_restriction_id_unique",

            key: {
                restrictionId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_restriction_pagination",

            key: {
                createdAt:
                    1,

                restrictionId:
                    1,
            },
        },
        {
            name:
                "access_restriction_identity_lookup",

            key: {
                identityId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                restrictionId:
                    1,
            },
        },
        {
            name:
                "access_restriction_membership_lookup",

            key: {
                membershipId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                restrictionId:
                    1,
            },
        },
        {
            name:
                "access_restriction_tenant_lookup",

            key: {
                tenantId:
                    1,

                status:
                    1,

                createdAt:
                    1,

                restrictionId:
                    1,
            },
        },
        {
            name:
                "access_restriction_expiration",

            key: {
                status:
                    1,

                expiresAt:
                    1,

                restrictionId:
                    1,
            },

            partialFilterExpression: {
                status:
                    "active",

                expiresAt: {
                    $exists:
                        true,
                },
            },
        },
    ];

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP INDEXES
// -----------------------------------------------------------------------------

const knownMembershipIndexes:
    IndexDescription[] = [
        {
            name:
                "access_known_membership_id_unique",

            key: {
                membershipId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_known_membership_identity_tenant_unique",

            key: {
                identityId:
                    1,

                tenantId:
                    1,
            },

            unique:
                true,
        },
        {
            name:
                "access_known_membership_pagination",

            key: {
                tenantId:
                    1,

                membershipId:
                    1,
            },
        },
        {
            name:
                "access_known_membership_identity_lookup",

            key: {
                identityId:
                    1,

                status:
                    1,

                tenantId:
                    1,

                membershipId:
                    1,
            },
        },
        {
            name:
                "access_known_membership_tenant_lookup",

            key: {
                tenantId:
                    1,

                status:
                    1,

                membershipId:
                    1,
            },
        },
    ];

// -----------------------------------------------------------------------------
// INDEX INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Creates every MongoDB index required by Access Operations™.
 *
 * MongoDB index creation is idempotent when index names and definitions remain
 * stable. This function can therefore be executed safely during runtime
 * initialization.
 *
 * All independent collection operations execute concurrently.
 */
export async function ensureMongoAccessIndexes(
    collections: MongoAccessCollections,
): Promise<void> {
    await Promise.all([
        collections.permissions.createIndexes(
            permissionIndexes,
            indexCreationOptions,
        ),

        collections.roles.createIndexes(
            roleIndexes,
            indexCreationOptions,
        ),

        collections.roleAssignments.createIndexes(
            roleAssignmentIndexes,
            indexCreationOptions,
        ),

        collections.permissionAssignments.createIndexes(
            permissionAssignmentIndexes,
            indexCreationOptions,
        ),

        collections.policies.createIndexes(
            authorizationPolicyIndexes,
            indexCreationOptions,
        ),

        collections.restrictions.createIndexes(
            accessRestrictionIndexes,
            indexCreationOptions,
        ),

        collections.knownMemberships.createIndexes(
            knownMembershipIndexes,
            indexCreationOptions,
        ),
    ]);
}