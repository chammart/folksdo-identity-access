// services/access/src/read-store/mongo/mongo-access-collections.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS COLLECTIONS
// -----------------------------------------------------------------------------
// MongoDB collection configuration and typed collection resolution for
// Access Operations™.
//
// Purpose:
//   • define every MongoDB collection owned by Access Operations™
//   • resolve strongly typed MongoDB collections once during composition
//   • centralize Mongo collection ownership
//   • eliminate duplicated collection resolution throughout the read store
//
// Boundary:
//   • MongoDB implementation only
//   • contains no business logic
//   • contains no authorization logic
//   • contains no pagination
//   • contains no indexes
//   • contains no query behavior
// -----------------------------------------------------------------------------

import type {
    Collection,
    Db,
} from "mongodb";

import type {
    KnownIdentity,
    KnownMembership,
    KnownSubscriptionCapabilities,
    KnownTenant,
} from "../../known-facts";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../../state";

// -----------------------------------------------------------------------------
// ACCESS COLLECTION NAMES
// -----------------------------------------------------------------------------

/**
 * MongoDB collection names required by Access Operations™.
 */
export interface MongoAccessCollectionNames {

    /**
     * Canonical Permission catalog.
     */
    readonly permissions: string;

    /**
     * Canonical Platform, System and Tenant Roles.
     */
    readonly roles: string;

    /**
     * Canonical Role Assignments.
     */
    readonly roleAssignments: string;

    /**
     * Canonical direct Permission Assignments.
     */
    readonly permissionAssignments: string;

    /**
     * Canonical Authorization Policies.
     */
    readonly policies: string;

    /**
     * Canonical Access Restrictions.
     */
    readonly restrictions: string;

    /**
     * Known Membership projection.
     */
    readonly knownMemberships: string;

    /**
     * Known Tenant projection.
     */
    readonly knownTenants: string;

    /**
     * Known Identity projection.
     */
    readonly knownIdentities: string;

    /**
     * Known Subscription Capabilities projection.
     */
    readonly knownSubscriptionCapabilities: string;
}

// -----------------------------------------------------------------------------
// COLLECTION FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateMongoAccessCollectionsInput {

    /**
     * Mongo database instance.
     */
    readonly database: Db;

    /**
     * Configured collection names.
     */
    readonly collections: MongoAccessCollectionNames;
}

// -----------------------------------------------------------------------------
// RESOLVED COLLECTIONS
// -----------------------------------------------------------------------------

/**
 * Strongly typed MongoDB collections used internally by the Mongo read store.
 *
 * These collections never escape the Mongo persistence boundary.
 */
export interface MongoAccessCollections {

    readonly permissions:
    Collection<PermissionState>;

    readonly roles:
    Collection<RoleState>;

    readonly roleAssignments:
    Collection<RoleAssignmentState>;

    readonly permissionAssignments:
    Collection<PermissionAssignmentState>;

    readonly policies:
    Collection<AuthorizationPolicyState>;

    readonly restrictions:
    Collection<AccessRestrictionState>;

    readonly knownMemberships:
    Collection<KnownMembership>;

    readonly knownTenants:
    Collection<KnownTenant>;

    readonly knownIdentities:
    Collection<KnownIdentity>;

    readonly knownSubscriptionCapabilities:
    Collection<KnownSubscriptionCapabilities>;
}

// -----------------------------------------------------------------------------
// COLLECTION RESOLUTION
// -----------------------------------------------------------------------------

/**
 * Resolves every MongoDB collection required by Access Operations™.
 *
 * Collection lookup occurs once during composition so that query
 * implementations operate against strongly typed collections without
 * repeatedly resolving them from the database instance.
 */
export function createMongoAccessCollections(
    input: CreateMongoAccessCollectionsInput,
): MongoAccessCollections {

    return {

        permissions:
            input.database.collection<PermissionState>(
                input.collections.permissions,
            ),

        roles:
            input.database.collection<RoleState>(
                input.collections.roles,
            ),

        roleAssignments:
            input.database.collection<RoleAssignmentState>(
                input.collections.roleAssignments,
            ),

        permissionAssignments:
            input.database.collection<PermissionAssignmentState>(
                input.collections.permissionAssignments,
            ),

        policies:
            input.database.collection<AuthorizationPolicyState>(
                input.collections.policies,
            ),

        restrictions:
            input.database.collection<AccessRestrictionState>(
                input.collections.restrictions,
            ),

        knownMemberships:
            input.database.collection<KnownMembership>(
                input.collections.knownMemberships,
            ),

        knownTenants:
            input.database.collection<KnownTenant>(
                input.collections.knownTenants,
            ),

        knownIdentities:
            input.database.collection<KnownIdentity>(
                input.collections.knownIdentities,
            ),

        knownSubscriptionCapabilities:
            input.database.collection<KnownSubscriptionCapabilities>(
                input.collections.knownSubscriptionCapabilities,
            ),
    };
}