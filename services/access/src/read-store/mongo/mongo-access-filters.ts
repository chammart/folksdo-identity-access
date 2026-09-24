// services/access/src/read-store/mongo/mongo-access-filters.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS FILTERS
// -----------------------------------------------------------------------------
// MongoDB filter builders for Access Operations™.
//
// Purpose:
//   • centralize reusable MongoDB query filters
//   • eliminate duplicated filter construction
//   • preserve provider-neutral business semantics
//   • support deterministic query composition
//
// Boundary:
//   • MongoDB implementation only
//   • contains no business rules
//   • contains no pagination
//   • contains no sorting
//   • contains no authorization evaluation
//   • contains no index creation
// -----------------------------------------------------------------------------

import type {
    Document,
    Filter,
} from "mongodb";

import type {
    KnownMembership,
} from "../../known-facts";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    RoleAssignmentState,
    RoleState,
} from "../../state";

// -----------------------------------------------------------------------------
// FILTER COMPOSITION
// -----------------------------------------------------------------------------

/**
 * Combines two MongoDB filters using a logical AND.
 *
 * Empty filters are ignored to avoid unnecessary nesting.
 *
 * MongoDB's Filter<TSchema> recursively applies WithId<TSchema> inside logical
 * operators. The explicit cast is isolated here so callers retain strongly
 * typed Filter<TSchema> contracts without leaking MongoDB's recursive generic
 * representation throughout the read-store implementation.
 */
export function combineFilters<
    TSchema extends Document,
>(
    first: Filter<TSchema>,
    second: Filter<TSchema>,
): Filter<TSchema> {

    if (Object.keys(first).length === 0) {
        return second;
    }

    if (Object.keys(second).length === 0) {
        return first;
    }

    return {
        $and: [
            first,
            second,
        ],
    } as unknown as Filter<TSchema>;
}

// -----------------------------------------------------------------------------
// ROLE FILTERS
// -----------------------------------------------------------------------------

/**
 * Creates the visible Role scope for a Tenant.
 *
 * Tenant queries may see:
 * • Tenant Roles
 * • System Roles
 * • Platform Roles
 */
export function createRoleScopeFilter(
    tenantId?: string,
): Filter<RoleState> {

    if (tenantId === undefined) {
        return {};
    }

    return {
        $or: [
            {
                tenantId,
            },
            {
                roleType: {
                    $in: [
                        "platform",
                        "system",
                    ],
                },
            },
        ],
    };
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY FILTERS
// -----------------------------------------------------------------------------

/**
 * Creates the Authorization Policy visibility scope.
 *
 * Tenant queries may evaluate:
 * • Tenant Policies
 * • Platform Policies
 */
export function createPolicyScopeFilter(
    tenantId?: string,
): Filter<AuthorizationPolicyState> {

    if (tenantId === undefined) {
        return {};
    }

    return {
        $or: [
            {
                tenantId,
            },
            {
                tenantId: {
                    $exists:
                        false,
                },
            },
        ],
    };
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT FILTERS
// -----------------------------------------------------------------------------

export function createRoleAssignmentFilter(
    membershipId?: string,
    identityId?: string,
): Filter<RoleAssignmentState> {

    return {

        ...(membershipId === undefined
            ? {}
            : {
                membershipId,
            }),

        ...(identityId === undefined
            ? {}
            : {
                identityId,
            }),
    };
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT FILTERS
// -----------------------------------------------------------------------------

export function createPermissionAssignmentFilter(
    membershipId?: string,
    identityId?: string,
): Filter<PermissionAssignmentState> {

    return {

        ...(membershipId === undefined
            ? {}
            : {
                membershipId,
            }),

        ...(identityId === undefined
            ? {}
            : {
                identityId,
            }),
    };
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION FILTERS
// -----------------------------------------------------------------------------

/**
 * Creates the ownership scope for general Access Restriction queries.
 *
 * When a Tenant is supplied, only Restrictions owned by that Tenant are
 * returned.
 *
 * Platform Restriction composition for authorization evaluation is handled
 * separately by mongo-access-authorization.ts.
 *
 * Generic read operations must not implicitly widen Tenant scope to include
 * Platform-owned Restrictions.
 */
export function createRestrictionScopeFilter(
    tenantId?: string,
): Filter<AccessRestrictionState> {

    if (tenantId === undefined) {
        return {};
    }

    return {
        tenantId,
    };
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP FILTERS
// -----------------------------------------------------------------------------

export function createKnownMembershipFilter(
    identityId?: string,
    tenantId?: string,
): Filter<KnownMembership> {

    return {

        ...(identityId === undefined
            ? {}
            : {
                identityId,
            }),

        ...(tenantId === undefined
            ? {}
            : {
                tenantId,
            }),
    };
}