// services/access/src/read-store/mongo/mongo-access-authorization.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS AUTHORIZATION
// -----------------------------------------------------------------------------
// MongoDB authorization-state lookup for Access Operations™.
//
// Purpose:
//   • load every Access-owned fact required for authorization
//   • execute independent MongoDB reads concurrently
//   • avoid repeated authorization-focused read-store round trips
//   • return deterministic canonical Access state
//   • isolate authorization query optimization from general read operations
//
// Boundary:
//   • MongoDB implementation only
//   • contains no authorization decision logic
//   • contains no permission-resolution logic
//   • contains no policy evaluation logic
//   • contains no business state transitions
//   • contains no index creation
//
// Authorization flow:
//   • Identity Operations™ establishes who the actor is
//   • Membership Operations™ establishes where the actor operates
//   • Access Operations™ loads the authorization state it owns
//   • the authorization evaluator determines whether the action is allowed
// -----------------------------------------------------------------------------

import type {
    Filter,
} from "mongodb";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../../state";

import type {
    AuthorizationLookupInput,
    AuthorizationLookupState,
} from "../access-read-store";

import type {
    MongoAccessCollections,
} from "./mongo-access-collections";

import {
    accessRestrictionSort,
    assignmentSort,
    authorizationPolicySort,
} from "./mongo-access-sorts";

// -----------------------------------------------------------------------------
// AUTHORIZATION LOOKUP INPUT
// -----------------------------------------------------------------------------

export interface LoadMongoAuthorizationStateInput {

    /**
     * Typed MongoDB collections owned by Access Operations™.
     */
    readonly collections:
    MongoAccessCollections;

    /**
     * Provider-neutral authorization lookup context.
     */
    readonly lookup:
    AuthorizationLookupInput;
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT FILTER
// -----------------------------------------------------------------------------

/**
 * Creates the active Role Assignment lookup filter.
 *
 * Role Assignments are Membership-scoped authorization state.
 *
 * Identity is validated through Access Known Facts and Membership context.
 * Canonical Role Assignment state is therefore resolved by Membership and
 * Tenant scope rather than by an Identity field that does not belong to the
 * assignment model.
 */
function createAuthorizationRoleAssignmentFilter(
    lookup: AuthorizationLookupInput,
): Filter<RoleAssignmentState> {
    return {
        identityId:
            lookup.identityId,

        ...(lookup.membershipId === undefined
            ? {}
            : {
                membershipId:
                    lookup.membershipId,
            }),

        ...(lookup.tenantId === undefined
            ? {}
            : {
                tenantId:
                    lookup.tenantId,
            }),

        status:
            "active",
    };
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT FILTER
// -----------------------------------------------------------------------------

/**
 * Creates the active direct Permission Assignment lookup filter.
 *
 * Permission Assignments are Membership-scoped authorization state.
 *
 * Identity is validated through Access Known Facts and Membership context.
 * Canonical Permission Assignment state is therefore resolved by Membership
 * and Tenant scope rather than by an Identity field that does not belong to
 * the assignment model.
 */
function createAuthorizationPermissionAssignmentFilter(
    lookup: AuthorizationLookupInput,
): Filter<PermissionAssignmentState> {
    return {
        identityId:
            lookup.identityId,

        ...(lookup.membershipId === undefined
            ? {}
            : {
                membershipId:
                    lookup.membershipId,
            }),

        ...(lookup.tenantId === undefined
            ? {}
            : {
                tenantId:
                    lookup.tenantId,
            }),

        status:
            "active",
    };
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY FILTER
// -----------------------------------------------------------------------------

/**
 * Creates the active Authorization Policy lookup filter.
 *
 * Platform authorization evaluates only Platform Policies.
 *
 * Tenant authorization evaluates:
 *   • active Tenant Policies for the current Tenant
 *   • active Platform Policies
 *
 * Platform-owned Policies are represented by the absence of tenantId.
 * The persistence model must never invent tenantId: null.
 */
function createAuthorizationPolicyFilter(
    lookup: AuthorizationLookupInput,
): Filter<AuthorizationPolicyState> {
    if (lookup.tenantId === undefined) {
        return {
            lifecycleStatus:
                "active",

            tenantId: {
                $exists: false,
            },
        };
    }

    return {
        lifecycleStatus:
            "active",

        $or: [
            {
                tenantId:
                    lookup.tenantId,
            },
            {
                tenantId: {
                    $exists: false,
                },
            },
        ],
    };
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION FILTER
// -----------------------------------------------------------------------------

/**
 * Creates the active Access Restriction lookup filter.
 *
 * Restrictions may apply to:
 *   • the authenticated Identity
 *   • the active Membership
 *   • the active Tenant
 *
 * Only scopes available in the lookup context are included.
 */
function createAuthorizationRestrictionFilter(
    lookup: AuthorizationLookupInput,
): Filter<AccessRestrictionState> {
    if (lookup.tenantId === undefined) {
        return {
            status:
                "active",

            tenantId: {
                $exists: false,
            },
        };
    }

    return {
        status:
            "active",

        $or: [
            {
                tenantId:
                    lookup.tenantId,
            },
            {
                tenantId: {
                    $exists: false,
                },
            },
        ],
    };
}

// -----------------------------------------------------------------------------
// AUTHORIZATION STATE LOADER
// -----------------------------------------------------------------------------

/**
 * Loads the complete Access-owned authorization state for one authorization
 * evaluation.
 *
 * The four reads are independent and therefore execute concurrently.
 *
 * This method deliberately returns canonical state only. It does not:
 *   • hydrate assigned Roles
 *   • hydrate referenced Permissions
 *   • resolve effective Permissions
 *   • evaluate Authorization Policies
 *   • apply permission precedence
 *   • produce an authorization decision
 *
 * Those responsibilities remain inside the authorization boundary.
 */
export async function loadMongoAuthorizationState(
    input: LoadMongoAuthorizationStateInput,
): Promise<AuthorizationLookupState> {
    const {
        roleAssignments,
        permissionAssignments,
        policies,
        restrictions,
    } = input.collections;

    const roleAssignmentFilter =
        createAuthorizationRoleAssignmentFilter(
            input.lookup,
        );

    const permissionAssignmentFilter =
        createAuthorizationPermissionAssignmentFilter(
            input.lookup,
        );

    const policyFilter =
        createAuthorizationPolicyFilter(
            input.lookup,
        );

    const restrictionFilter =
        createAuthorizationRestrictionFilter(
            input.lookup,
        );

    const [
        applicableRoleAssignments,
        applicablePermissionAssignments,
        applicablePolicies,
        applicableRestrictions,
    ] = await Promise.all([
        roleAssignments
            .find(
                roleAssignmentFilter,
            )
            .sort(
                assignmentSort,
            )
            .toArray(),

        permissionAssignments
            .find(
                permissionAssignmentFilter,
            )
            .sort(
                assignmentSort,
            )
            .toArray(),

        policies
            .find(
                policyFilter,
            )
            .sort(
                authorizationPolicySort,
            )
            .toArray(),

        restrictions
            .find(
                restrictionFilter,
            )
            .sort(
                accessRestrictionSort,
            )
            .toArray(),
    ]);

    return {
        roleAssignments:
            applicableRoleAssignments,

        permissionAssignments:
            applicablePermissionAssignments,

        policies:
            applicablePolicies,

        restrictions:
            applicableRestrictions,
    };
}