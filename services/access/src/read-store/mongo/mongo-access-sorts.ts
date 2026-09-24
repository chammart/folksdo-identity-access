// services/access/src/read-store/mongo/mongo-access-sorts.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS SORTS
// -----------------------------------------------------------------------------
// Deterministic MongoDB sort definitions for Access Operations™.
//
// Purpose:
//   • centralize deterministic ordering for every Access list operation
//   • keep cursor pagination aligned with persisted query ordering
//   • ensure repeated reads produce stable results
//   • prevent sort definitions from drifting across query implementations
//
// Boundary:
//   • MongoDB implementation only
//   • contains no business logic
//   • contains no authorization evaluation
//   • contains no filtering behavior
//   • contains no cursor encoding or decoding
//   • contains no index creation
//
// Determinism:
//   • business-significant fields are ordered first
//   • the stable Access-owned identifier is always the final tie-breaker
//   • every paginated query must use the matching cursor field order
// -----------------------------------------------------------------------------

import type {
    Sort,
} from "mongodb";

// -----------------------------------------------------------------------------
// PERMISSION SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic Permission catalog ordering.
 *
 * Order:
 *   1. service
 *   2. resource
 *   3. action
 *   4. permissionId
 */
export const permissionSort: Sort = {
    service: 1,
    resource: 1,
    action: 1,
    permissionId: 1,
};

// -----------------------------------------------------------------------------
// ROLE SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic Role ordering.
 *
 * Order:
 *   1. roleType
 *   2. name
 *   3. roleId
 */
export const roleSort: Sort = {
    roleType: 1,
    name: 1,
    roleId: 1,
};

// -----------------------------------------------------------------------------
// ASSIGNMENT SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic ordering shared by Role Assignments and direct Permission
 * Assignments.
 *
 * Order:
 *   1. createdAt
 *   2. assignmentId
 */
export const assignmentSort: Sort = {
    createdAt: 1,
    assignmentId: 1,
};

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic Authorization Policy ordering.
 *
 * AuthorizationPolicyState does not own an explicit priority field.
 * Policy precedence must therefore remain inside deterministic policy
 * evaluation and must not be invented by the persistence layer.
 *
 * Order:
 *   1. scope
 *   2. name
 *   3. version
 *   4. policyId
 */
export const authorizationPolicySort: Sort = {
    scope: 1,
    name: 1,
    version: 1,
    policyId: 1,
};

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic Access Restriction ordering.
 *
 * Order:
 *   1. createdAt
 *   2. restrictionId
 */
export const accessRestrictionSort: Sort = {
    createdAt: 1,
    restrictionId: 1,
};

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP SORT
// -----------------------------------------------------------------------------

/**
 * Deterministic Known Membership ordering.
 *
 * Order:
 *   1. tenantId
 *   2. membershipId
 */
export const knownMembershipSort: Sort = {
    tenantId: 1,
    membershipId: 1,
};