// services/access/src/read-store/mongo/mongo-access-pagination.ts
// -----------------------------------------------------------------------------
// MONGO ACCESS PAGINATION
// -----------------------------------------------------------------------------
// Cursor-based MongoDB pagination for Access Operations™.
//
// Purpose:
//   • provide bounded cursor-based pagination
//   • encode provider-specific cursor state behind an opaque string
//   • preserve deterministic continuation across Access list operations
//   • keep cursor field order aligned with MongoDB sort definitions
//   • prevent MongoDB document metadata from leaking through the read store
//
// Boundary:
//   • MongoDB implementation only
//   • contains no business rules
//   • contains no authorization evaluation
//   • contains no index creation
//   • contains no collection resolution
//
// Pagination model:
//   • cursor-based rather than offset-based
//   • deterministic business fields first
//   • stable Access-owned identifier as the final tie-breaker
//   • one additional document is read to determine whether another page exists
// -----------------------------------------------------------------------------

import type {
    Collection,
    Document,
    Filter,
    Sort,
    WithId,
} from "mongodb";

import type {
    KnownMembership,
} from "../../known-facts";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../../state";

import type {
    AccessPage,
    AccessPageRequest,
} from "../access-read-store";

import {
    combineFilters,
} from "./mongo-access-filters";

// -----------------------------------------------------------------------------
// PAGINATION LIMITS
// -----------------------------------------------------------------------------

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

// -----------------------------------------------------------------------------
// PERMISSION CURSOR
// -----------------------------------------------------------------------------

interface PermissionPageCursor {
    readonly type: "permission";

    readonly service: string;

    readonly resource: string;

    readonly action: string;

    readonly permissionId: string;
}

// -----------------------------------------------------------------------------
// ROLE CURSOR
// -----------------------------------------------------------------------------

interface RolePageCursor {
    readonly type: "role";

    readonly roleType:
    RoleState["roleType"];

    readonly name: string;

    readonly roleId: string;
}

// -----------------------------------------------------------------------------
// ASSIGNMENT CURSOR
// -----------------------------------------------------------------------------

interface AssignmentPageCursor {
    readonly type:
    | "role-assignment"
    | "permission-assignment";

    readonly createdAt: string;

    readonly assignmentId: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY CURSOR
// -----------------------------------------------------------------------------

interface AuthorizationPolicyPageCursor {
    readonly type: "authorization-policy";

    readonly scope:
    AuthorizationPolicyState["scope"];

    readonly name: string;

    readonly version: number;

    readonly policyId: string;
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION CURSOR
// -----------------------------------------------------------------------------

interface AccessRestrictionPageCursor {
    readonly type: "access-restriction";

    readonly createdAt: string;

    readonly restrictionId: string;
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP CURSOR
// -----------------------------------------------------------------------------

interface KnownMembershipPageCursor {
    readonly type: "known-membership";

    readonly tenantId: string;

    readonly membershipId: string;
}

// -----------------------------------------------------------------------------
// CURSOR UNION
// -----------------------------------------------------------------------------

type AccessMongoPageCursor =
    | PermissionPageCursor
    | RolePageCursor
    | AssignmentPageCursor
    | AuthorizationPolicyPageCursor
    | AccessRestrictionPageCursor
    | KnownMembershipPageCursor;

// -----------------------------------------------------------------------------
// PAGE LIMIT RESOLUTION
// -----------------------------------------------------------------------------

/**
 * Resolves and bounds the requested page size.
 *
 * Invalid values are rejected rather than silently converted because page
 * limits are part of the public query contract.
 */
function resolvePageLimit(
    requestedLimit?: number,
): number {
    if (requestedLimit === undefined) {
        return DEFAULT_PAGE_LIMIT;
    }

    if (
        !Number.isInteger(
            requestedLimit,
        )
        || requestedLimit <= 0
    ) {
        throw new Error(
            "Access page limit must be a positive integer.",
        );
    }

    return Math.min(
        requestedLimit,
        MAX_PAGE_LIMIT,
    );
}

// -----------------------------------------------------------------------------
// CURSOR ENCODING
// -----------------------------------------------------------------------------

/**
 * Encodes MongoDB continuation state into an opaque URL-safe cursor.
 *
 * Consumers must treat the resulting value as opaque and must never depend on
 * its internal representation.
 */
function encodeCursor(
    cursor: AccessMongoPageCursor,
): string {
    return Buffer
        .from(
            JSON.stringify(
                cursor,
            ),
            "utf8",
        )
        .toString(
            "base64url",
        );
}

// -----------------------------------------------------------------------------
// CURSOR DECODING
// -----------------------------------------------------------------------------

/**
 * Decodes and validates an opaque Access pagination cursor.
 *
 * Cursor types are query-specific. A cursor generated for one list operation
 * cannot be reused with another list operation.
 */
function decodeCursor<
    TCursor extends AccessMongoPageCursor,
>(
    encodedCursor: string | undefined,
    expectedType: TCursor["type"],
): TCursor | undefined {
    if (encodedCursor === undefined) {
        return undefined;
    }

    try {
        const decoded =
            JSON.parse(
                Buffer
                    .from(
                        encodedCursor,
                        "base64url",
                    )
                    .toString(
                        "utf8",
                    ),
            ) as Partial<AccessMongoPageCursor>;

        if (
            decoded.type !== expectedType
        ) {
            throw new Error(
                "Cursor type does not match query type.",
            );
        }

        return decoded as TCursor;
    } catch {
        throw new Error(
            "Invalid Access pagination cursor.",
        );
    }
}

// -----------------------------------------------------------------------------
// MONGO DOCUMENT NORMALIZATION
// -----------------------------------------------------------------------------

/**
 * Removes MongoDB-owned document metadata from a persisted Access document.
 *
 * Access read-store consumers receive canonical Access state only. MongoDB's
 * generated `_id` field belongs exclusively to the persistence provider and
 * must never escape through the provider-neutral read-store contract.
 */
function normalizeMongoDocument<
    TState extends Document,
>(
    document: WithId<TState>,
): TState {
    const {
        _id: _mongoDocumentId,
        ...state
    } = document;

    return state as unknown as TState;
}

// -----------------------------------------------------------------------------
// GENERIC PAGE READER
// -----------------------------------------------------------------------------

/**
 * Reads one deterministic MongoDB page.
 *
 * The query reads one additional document beyond the requested limit. The
 * additional document is never returned and is used only to determine whether
 * another page exists.
 *
 * MongoDB's `_id` field is removed before canonical state is returned.
 */
async function readPage<
    TState extends Document,
    TCursor extends AccessMongoPageCursor,
>(
    input: {
        readonly collection:
        Collection<TState>;

        readonly filter:
        Filter<TState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;

        readonly decode:
        (
            cursor?: string,
        ) => TCursor | undefined;

        readonly createCursor:
        (
            state: TState,
        ) => TCursor;

        readonly applyCursor:
        (
            filter: Filter<TState>,
            cursor: TCursor,
        ) => Filter<TState>;
    },
): Promise<AccessPage<TState>> {
    const limit =
        resolvePageLimit(
            input.page?.limit,
        );

    const cursor =
        input.decode(
            input.page?.cursor,
        );

    const effectiveFilter =
        cursor === undefined
            ? input.filter
            : input.applyCursor(
                input.filter,
                cursor,
            );

    const documents =
        await input.collection
            .find(
                effectiveFilter,
            )
            .sort(
                input.sort,
            )
            .limit(
                limit + 1,
            )
            .toArray();

    const hasAdditionalPage =
        documents.length > limit;

    const pageDocuments =
        hasAdditionalPage
            ? documents.slice(
                0,
                limit,
            )
            : documents;

    const items =
        pageDocuments.map(
            normalizeMongoDocument,
        );

    const lastItem =
        items.at(
            -1,
        );

    return {
        items,

        nextCursor:
            hasAdditionalPage
                && lastItem !== undefined
                ? encodeCursor(
                    input.createCursor(
                        lastItem,
                    ),
                )
                : undefined,
    };
}

// -----------------------------------------------------------------------------
// PERMISSION CURSOR FILTER
// -----------------------------------------------------------------------------

function applyPermissionCursor(
    filter: Filter<PermissionState>,
    cursor: PermissionPageCursor,
): Filter<PermissionState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    service: {
                        $gt: cursor.service,
                    },
                },
                {
                    service:
                        cursor.service,

                    resource: {
                        $gt: cursor.resource,
                    },
                },
                {
                    service:
                        cursor.service,

                    resource:
                        cursor.resource,

                    action: {
                        $gt: cursor.action,
                    },
                },
                {
                    service:
                        cursor.service,

                    resource:
                        cursor.resource,

                    action:
                        cursor.action,

                    permissionId: {
                        $gt:
                            cursor.permissionId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// ROLE CURSOR FILTER
// -----------------------------------------------------------------------------

function applyRoleCursor(
    filter: Filter<RoleState>,
    cursor: RolePageCursor,
): Filter<RoleState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    roleType: {
                        $gt: cursor.roleType,
                    },
                },
                {
                    roleType:
                        cursor.roleType,

                    name: {
                        $gt: cursor.name,
                    },
                },
                {
                    roleType:
                        cursor.roleType,

                    name:
                        cursor.name,

                    roleId: {
                        $gt: cursor.roleId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT CURSOR FILTER
// -----------------------------------------------------------------------------

function applyRoleAssignmentCursor(
    filter: Filter<RoleAssignmentState>,
    cursor: AssignmentPageCursor,
): Filter<RoleAssignmentState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    createdAt: {
                        $gt: cursor.createdAt,
                    },
                },
                {
                    createdAt:
                        cursor.createdAt,

                    assignmentId: {
                        $gt:
                            cursor.assignmentId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT CURSOR FILTER
// -----------------------------------------------------------------------------

function applyPermissionAssignmentCursor(
    filter: Filter<PermissionAssignmentState>,
    cursor: AssignmentPageCursor,
): Filter<PermissionAssignmentState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    createdAt: {
                        $gt: cursor.createdAt,
                    },
                },
                {
                    createdAt:
                        cursor.createdAt,

                    assignmentId: {
                        $gt:
                            cursor.assignmentId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY CURSOR FILTER
// -----------------------------------------------------------------------------

function applyAuthorizationPolicyCursor(
    filter: Filter<AuthorizationPolicyState>,
    cursor: AuthorizationPolicyPageCursor,
): Filter<AuthorizationPolicyState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    scope: {
                        $gt: cursor.scope,
                    },
                },
                {
                    scope:
                        cursor.scope,

                    name: {
                        $gt: cursor.name,
                    },
                },
                {
                    scope:
                        cursor.scope,

                    name:
                        cursor.name,

                    version: {
                        $gt: cursor.version,
                    },
                },
                {
                    scope:
                        cursor.scope,

                    name:
                        cursor.name,

                    version:
                        cursor.version,

                    policyId: {
                        $gt: cursor.policyId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION CURSOR FILTER
// -----------------------------------------------------------------------------

function applyAccessRestrictionCursor(
    filter: Filter<AccessRestrictionState>,
    cursor: AccessRestrictionPageCursor,
): Filter<AccessRestrictionState> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    createdAt: {
                        $gt: cursor.createdAt,
                    },
                },
                {
                    createdAt:
                        cursor.createdAt,

                    restrictionId: {
                        $gt:
                            cursor.restrictionId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP CURSOR FILTER
// -----------------------------------------------------------------------------

function applyKnownMembershipCursor(
    filter: Filter<KnownMembership>,
    cursor: KnownMembershipPageCursor,
): Filter<KnownMembership> {
    return combineFilters(
        filter,
        {
            $or: [
                {
                    tenantId: {
                        $gt: cursor.tenantId,
                    },
                },
                {
                    tenantId:
                        cursor.tenantId,

                    membershipId: {
                        $gt:
                            cursor.membershipId,
                    },
                },
            ],
        },
    );
}

// -----------------------------------------------------------------------------
// PERMISSION PAGE
// -----------------------------------------------------------------------------

export function readPermissionPage(
    input: {
        readonly collection:
        Collection<PermissionState>;

        readonly filter:
        Filter<PermissionState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<PermissionState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<PermissionPageCursor>(
                cursor,
                "permission",
            ),

        createCursor: (
            permission,
        ) => ({
            type:
                "permission",

            service:
                permission.service,

            resource:
                permission.resource,

            action:
                permission.action,

            permissionId:
                permission.permissionId,
        }),

        applyCursor:
            applyPermissionCursor,
    });
}

// -----------------------------------------------------------------------------
// ROLE PAGE
// -----------------------------------------------------------------------------

export function readRolePage(
    input: {
        readonly collection:
        Collection<RoleState>;

        readonly filter:
        Filter<RoleState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<RoleState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<RolePageCursor>(
                cursor,
                "role",
            ),

        createCursor: (
            role,
        ) => ({
            type:
                "role",

            roleType:
                role.roleType,

            name:
                role.name,

            roleId:
                role.roleId,
        }),

        applyCursor:
            applyRoleCursor,
    });
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT PAGE
// -----------------------------------------------------------------------------

export function readRoleAssignmentPage(
    input: {
        readonly collection:
        Collection<RoleAssignmentState>;

        readonly filter:
        Filter<RoleAssignmentState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<RoleAssignmentState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<AssignmentPageCursor>(
                cursor,
                "role-assignment",
            ),

        createCursor: (
            assignment,
        ) => ({
            type:
                "role-assignment",

            createdAt:
                assignment.createdAt,

            assignmentId:
                assignment.assignmentId,
        }),

        applyCursor:
            applyRoleAssignmentCursor,
    });
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT PAGE
// -----------------------------------------------------------------------------

export function readPermissionAssignmentPage(
    input: {
        readonly collection:
        Collection<PermissionAssignmentState>;

        readonly filter:
        Filter<PermissionAssignmentState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<PermissionAssignmentState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<AssignmentPageCursor>(
                cursor,
                "permission-assignment",
            ),

        createCursor: (
            assignment,
        ) => ({
            type:
                "permission-assignment",

            createdAt:
                assignment.createdAt,

            assignmentId:
                assignment.assignmentId,
        }),

        applyCursor:
            applyPermissionAssignmentCursor,
    });
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY PAGE
// -----------------------------------------------------------------------------

export function readAuthorizationPolicyPage(
    input: {
        readonly collection:
        Collection<AuthorizationPolicyState>;

        readonly filter:
        Filter<AuthorizationPolicyState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<AuthorizationPolicyState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<AuthorizationPolicyPageCursor>(
                cursor,
                "authorization-policy",
            ),

        createCursor: (
            policy,
        ) => ({
            type:
                "authorization-policy",

            scope:
                policy.scope,

            name:
                policy.name,

            version:
                policy.version,

            policyId:
                policy.policyId,
        }),

        applyCursor:
            applyAuthorizationPolicyCursor,
    });
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION PAGE
// -----------------------------------------------------------------------------

export function readAccessRestrictionPage(
    input: {
        readonly collection:
        Collection<AccessRestrictionState>;

        readonly filter:
        Filter<AccessRestrictionState>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<AccessRestrictionState>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<AccessRestrictionPageCursor>(
                cursor,
                "access-restriction",
            ),

        createCursor: (
            restriction,
        ) => ({
            type:
                "access-restriction",

            createdAt:
                restriction.createdAt,

            restrictionId:
                restriction.restrictionId,
        }),

        applyCursor:
            applyAccessRestrictionCursor,
    });
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP PAGE
// -----------------------------------------------------------------------------

export function readKnownMembershipPage(
    input: {
        readonly collection:
        Collection<KnownMembership>;

        readonly filter:
        Filter<KnownMembership>;

        readonly sort:
        Sort;

        readonly page?:
        AccessPageRequest;
    },
): Promise<AccessPage<KnownMembership>> {
    return readPage({
        ...input,

        decode: (
            cursor,
        ) =>
            decodeCursor<KnownMembershipPageCursor>(
                cursor,
                "known-membership",
            ),

        createCursor: (
            membership,
        ) => ({
            type:
                "known-membership",

            tenantId:
                membership.tenantId,

            membershipId:
                membership.membershipId,
        }),

        applyCursor:
            applyKnownMembershipCursor,
    });
}