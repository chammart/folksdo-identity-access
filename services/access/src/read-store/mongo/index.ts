// services/access/src/read-store/mongo/index.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS READ STORE
// -----------------------------------------------------------------------------
// Public MongoDB implementation surface for Access Operations™.
//
// Purpose:
//   • expose MongoDB read-store composition through one stable module boundary
//   • keep internal MongoDB helpers independently testable
//   • prevent callers from depending on internal file locations
//   • preserve a clean provider-specific read-store namespace
//
// Boundary:
//   • exports MongoDB persistence infrastructure only
//   • contains no business rules
//   • contains no authorization evaluation
//   • contains no runtime composition
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// COLLECTIONS
// -----------------------------------------------------------------------------

export {
    createMongoAccessCollections,
} from "./mongo-access-collections";

export type {
    MongoAccessCollectionNames,
    CreateMongoAccessCollectionsInput,
    MongoAccessCollections,
} from "./mongo-access-collections";

// -----------------------------------------------------------------------------
// FILTERS
// -----------------------------------------------------------------------------

export {
    combineFilters,
    createKnownMembershipFilter,
    createPermissionAssignmentFilter,
    createPolicyScopeFilter,
    createRestrictionScopeFilter,
    createRoleAssignmentFilter,
    createRoleScopeFilter,
} from "./mongo-access-filters";

// -----------------------------------------------------------------------------
// SORTS
// -----------------------------------------------------------------------------

export {
    accessRestrictionSort,
    assignmentSort,
    authorizationPolicySort,
    knownMembershipSort,
    permissionSort,
    roleSort,
} from "./mongo-access-sorts";

// -----------------------------------------------------------------------------
// PAGINATION
// -----------------------------------------------------------------------------

export {
    readAccessRestrictionPage,
    readAuthorizationPolicyPage,
    readKnownMembershipPage,
    readPermissionAssignmentPage,
    readPermissionPage,
    readRoleAssignmentPage,
    readRolePage,
} from "./mongo-access-pagination";

// -----------------------------------------------------------------------------
// AUTHORIZATION LOOKUP
// -----------------------------------------------------------------------------

export {
    loadMongoAuthorizationState,
} from "./mongo-access-authorization";

export type {
    LoadMongoAuthorizationStateInput,
} from "./mongo-access-authorization";

// -----------------------------------------------------------------------------
// INDEXES
// -----------------------------------------------------------------------------

export {
    ensureMongoAccessIndexes,
} from "./mongo-access-indexes";