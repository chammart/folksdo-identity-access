// services/access/src/adapters/better-auth-access-adapter.ts
// -----------------------------------------------------------------------------
// BETTERAUTH ACCESS ADAPTER
// -----------------------------------------------------------------------------
// BetterAuth implementation of the Access-owned external authorization
// projection contract.
//
// Purpose:
//   • project Access-owned Tenant Roles into BetterAuth organization Roles
//   • project complete Tenant Membership Role sets into BetterAuth members
//   • isolate BetterAuth API shapes from the Access business model
//   • preserve deterministic and idempotent provider synchronization
//   • reject provider capabilities that BetterAuth does not support
//
// Boundary:
//   • this is the only Access adapter allowed to reference BetterAuth APIs
//   • Access Operations™ remains the canonical authorization authority
//   • BetterAuth is treated only as an external authorization projection
//   • provider identifiers never become Access-owned canonical identifiers
//   • authorization decisions are never delegated to this adapter
//   • no Access business rule is implemented inside this adapter
//
// BetterAuth requirements:
//   • the organization plugin must be enabled
//   • dynamicAccessControl.enabled must be true
//   • the configured BetterAuth access-control statement must contain every
//     resource and action projected by Access Operations™
//   • protected BetterAuth organization operations require authorized headers
//
// Dependency direction:
//
//   Access application layer
//             ↓
//        AccessProvider
//             ↑
//   BetterAuth Access Adapter
//             ↑
//       BetterAuth API
//
// Important:
//   • Access is the source of truth
//   • BetterAuth is a projection target
//   • synchronization uses complete desired-state replacement semantics
//   • unsupported capabilities fail explicitly
// -----------------------------------------------------------------------------

import type {
    AccessProvider,
    AccessProviderOperationResult,
    AccessProviderPermissionMap,
    InvalidateProviderAuthorizationStateInput,
    RemoveTenantRoleInput,
    SynchronizeTenantRoleAssignmentsInput,
    SynchronizeTenantRoleInput,
} from "./access-provider";

// -----------------------------------------------------------------------------
// BETTERAUTH PROVIDER API SHAPES
// -----------------------------------------------------------------------------
// These structural contracts describe only the BetterAuth API operations used
// by this adapter.
//
// They intentionally avoid exporting BetterAuth types across the Access
// boundary. A configured `auth.api` object may satisfy this contract without
// leaking the complete BetterAuth instance into Access business packages.
// -----------------------------------------------------------------------------

interface BetterAuthOrganizationRole {
    readonly id: string;
    readonly organizationId: string;
    readonly role: string;
    readonly permission: unknown;
}

interface BetterAuthCreateOrganizationRoleInput {
    readonly body: {
        readonly role: string;
        readonly permission: Record<string, string[]>;
        readonly organizationId: string;
    };

    readonly headers: Headers;
}

interface BetterAuthGetOrganizationRoleInput {
    readonly query: {
        readonly roleName: string;
        readonly organizationId: string;
    };

    readonly headers: Headers;
}

interface BetterAuthUpdateOrganizationRoleInput {
    readonly body: {
        readonly roleName: string;
        readonly organizationId: string;

        readonly data: {
            readonly roleName: string;
            readonly permission: Record<string, string[]>;
        };
    };

    readonly headers: Headers;
}

interface BetterAuthDeleteOrganizationRoleInput {
    readonly body: {
        readonly roleName: string;
        readonly organizationId: string;
    };

    readonly headers: Headers;
}

interface BetterAuthUpdateMemberRoleInput {
    readonly body: {
        readonly role: string | string[];
        readonly memberId: string;
        readonly organizationId: string;
    };

    readonly headers: Headers;
}

/**
 * Minimal BetterAuth server API surface required by the Access adapter.
 *
 * Runtime composition supplies a compatible configured BetterAuth API object.
 * No BetterAuth API type escapes this adapter module.
 */
export interface BetterAuthAccessApi {
    createOrgRole(
        input: BetterAuthCreateOrganizationRoleInput,
    ): Promise<BetterAuthOrganizationRole>;

    getOrgRole(
        input: BetterAuthGetOrganizationRoleInput,
    ): Promise<BetterAuthOrganizationRole | null>;

    updateOrgRole(
        input: BetterAuthUpdateOrganizationRoleInput,
    ): Promise<BetterAuthOrganizationRole>;

    deleteOrgRole(
        input: BetterAuthDeleteOrganizationRoleInput,
    ): Promise<unknown>;

    updateMemberRole(
        input: BetterAuthUpdateMemberRoleInput,
    ): Promise<unknown>;
}

// -----------------------------------------------------------------------------
// ADAPTER DEPENDENCIES
// -----------------------------------------------------------------------------

export interface ResolveBetterAuthMemberIdInput {
    /**
     * Access-owned Tenant identifier.
     *
     * The BetterAuth organization identifier may match this value directly or
     * be mapped by runtime composition.
     */
    readonly tenantId: string;

    /**
     * Access-owned Membership identifier.
     */
    readonly membershipId: string;

    /**
     * Access-owned global Identity identifier.
     */
    readonly identityId: string;
}

/**
 * Resolves an Access Membership to the corresponding BetterAuth organization
 * member identifier.
 *
 * Access Membership identifiers and BetterAuth organization-member identifiers
 * are separate concepts and must not be assumed to be interchangeable.
 */
export type ResolveBetterAuthMemberId = (
    input: ResolveBetterAuthMemberIdInput,
) => Promise<string | null>;

export interface CreateBetterAuthAccessAdapterInput {
    /**
     * Configured BetterAuth server API.
     *
     * Runtime composition may pass the `api` property from the application-owned
     * BetterAuth instance when it structurally satisfies BetterAuthAccessApi.
     */
    readonly api: BetterAuthAccessApi;

    /**
     * Produces authorized request headers for protected BetterAuth organization
     * operations.
     *
     * Runtime composition owns session, service-account, or other authorization
     * mechanics required to produce these headers.
     */
    readonly createHeaders: () => Headers | Promise<Headers>;

    /**
     * Resolves Access Memberships to BetterAuth organization-member IDs.
     */
    readonly resolveMemberId: ResolveBetterAuthMemberId;
}

// -----------------------------------------------------------------------------
// ADAPTER ERRORS
// -----------------------------------------------------------------------------

export type BetterAuthAccessAdapterErrorCode =
    | "better_auth_member_not_found"
    | "better_auth_operation_failed"
    | "better_auth_permission_map_invalid"
    | "better_auth_provider_capability_unsupported"
    | "better_auth_role_name_invalid";

export class BetterAuthAccessAdapterError extends Error {
    public constructor(
        public readonly code: BetterAuthAccessAdapterErrorCode,
        message: string,
        options?: {
            readonly cause?: unknown;
        },
    ) {
        super(message, options);

        this.name = new.target.name;
    }
}

export class BetterAuthMemberNotFoundError
    extends BetterAuthAccessAdapterError {
    public constructor(
        membershipId: string,
    ) {
        super(
            "better_auth_member_not_found",
            `No BetterAuth organization member was resolved for Access Membership "${membershipId}".`,
        );
    }
}

export class BetterAuthProviderCapabilityUnsupportedError
    extends BetterAuthAccessAdapterError {
    public constructor(
        capability: string,
    ) {
        super(
            "better_auth_provider_capability_unsupported",
            `BetterAuth does not support the Access provider capability "${capability}".`,
        );
    }
}

export class BetterAuthPermissionMapInvalidError
    extends BetterAuthAccessAdapterError {
    public constructor(
        message: string,
    ) {
        super(
            "better_auth_permission_map_invalid",
            message,
        );
    }
}

export class BetterAuthRoleNameInvalidError
    extends BetterAuthAccessAdapterError {
    public constructor(
        message: string,
    ) {
        super(
            "better_auth_role_name_invalid",
            message,
        );
    }
}

export class BetterAuthOperationFailedError
    extends BetterAuthAccessAdapterError {
    public constructor(
        operation: string,
        cause: unknown,
    ) {
        super(
            "better_auth_operation_failed",
            `BetterAuth Access operation "${operation}" failed.`,
            {
                cause,
            },
        );
    }
}

// -----------------------------------------------------------------------------
// NORMALIZED PERMISSION MAP
// -----------------------------------------------------------------------------

type MutablePermissionMap = Record<string, string[]>;

/**
 * Produces the mutable resource/action representation expected by BetterAuth.
 *
 * Resource names and actions are trimmed, sorted, and deduplicated so retries
 * produce stable provider payloads independent of input ordering.
 */
function normalizePermissionMap(
    permissions: AccessProviderPermissionMap,
): MutablePermissionMap {
    const normalized: MutablePermissionMap = {};

    for (
        const sourceResource
        of Object.keys(permissions).sort()
    ) {
        const resource = sourceResource.trim();

        if (resource.length === 0) {
            throw new BetterAuthPermissionMapInvalidError(
                "BetterAuth permission resources must not be empty.",
            );
        }

        if (
            Object.prototype.hasOwnProperty.call(
                normalized,
                resource,
            )
        ) {
            throw new BetterAuthPermissionMapInvalidError(
                `BetterAuth permission resource "${resource}" is duplicated after normalization.`,
            );
        }

        const actions = [
            ...new Set(
                permissions[sourceResource]
                    .map(
                        (action) =>
                            action.trim(),
                    )
                    .filter(
                        (action) =>
                            action.length > 0,
                    ),
            ),
        ].sort();

        if (actions.length === 0) {
            throw new BetterAuthPermissionMapInvalidError(
                `BetterAuth permission resource "${resource}" must contain at least one action.`,
            );
        }

        normalized[resource] = actions;
    }

    return normalized;
}

/**
 * Parses the permission representation returned by BetterAuth.
 *
 * Depending on the configured storage adapter, BetterAuth may expose an
 * organization-role permission value as an object or serialized JSON.
 *
 * Invalid provider-owned values are treated as an empty map. The subsequent
 * comparison will cause Access to replace the malformed projection with the
 * canonical desired state.
 */
function parseBetterAuthPermissionMap(
    permission: unknown,
): MutablePermissionMap {
    if (typeof permission === "string") {
        try {
            return normalizeUnknownPermissionMap(
                JSON.parse(permission),
            );
        }
        catch {
            return {};
        }
    }

    return normalizeUnknownPermissionMap(
        permission,
    );
}

/**
 * Safely normalizes an unknown provider permission value.
 */
function normalizeUnknownPermissionMap(
    permission: unknown,
): MutablePermissionMap {
    if (
        permission === null
        || typeof permission !== "object"
        || Array.isArray(permission)
    ) {
        return {};
    }

    const normalized: MutablePermissionMap = {};

    for (
        const [
            sourceResource,
            value,
        ]
        of Object.entries(permission)
    ) {
        const resource = sourceResource.trim();

        if (
            resource.length === 0
            || !Array.isArray(value)
        ) {
            continue;
        }

        const actions = [
            ...new Set(
                value
                    .filter(
                        (action): action is string =>
                            typeof action === "string",
                    )
                    .map(
                        (action) =>
                            action.trim(),
                    )
                    .filter(
                        (action) =>
                            action.length > 0,
                    ),
            ),
        ].sort();

        if (actions.length === 0) {
            continue;
        }

        normalized[resource] = actions;
    }

    return normalized;
}

/**
 * Compares normalized provider permission maps.
 */
function permissionMapsEqual(
    left: MutablePermissionMap,
    right: MutablePermissionMap,
): boolean {
    const leftResources =
        Object.keys(left).sort();

    const rightResources =
        Object.keys(right).sort();

    if (
        leftResources.length
        !== rightResources.length
    ) {
        return false;
    }

    for (
        let resourceIndex = 0;
        resourceIndex < leftResources.length;
        resourceIndex += 1
    ) {
        const leftResource =
            leftResources[resourceIndex];

        const rightResource =
            rightResources[resourceIndex];

        if (
            leftResource !== rightResource
        ) {
            return false;
        }

        const leftActions =
            left[leftResource];

        const rightActions =
            right[rightResource];

        if (
            leftActions.length
            !== rightActions.length
        ) {
            return false;
        }

        for (
            let actionIndex = 0;
            actionIndex < leftActions.length;
            actionIndex += 1
        ) {
            if (
                leftActions[actionIndex]
                !== rightActions[actionIndex]
            ) {
                return false;
            }
        }
    }

    return true;
}

// -----------------------------------------------------------------------------
// NORMALIZED ROLE DATA
// -----------------------------------------------------------------------------

/**
 * Produces a valid normalized BetterAuth Role name.
 */
function normalizeRoleName(
    roleName: string,
): string {
    const normalized =
        roleName.trim();

    if (normalized.length === 0) {
        throw new BetterAuthRoleNameInvalidError(
            "BetterAuth Role names must not be empty.",
        );
    }

    return normalized;
}

/**
 * Produces a stable and duplicate-free BetterAuth Role set.
 *
 * An empty result is valid and represents removal of all projected Tenant Roles
 * from the BetterAuth organization member.
 */
function normalizeRoleNames(
    roleNames: readonly string[],
): string[] {
    return [
        ...new Set(
            roleNames
                .map(
                    (roleName) =>
                        roleName.trim(),
                )
                .filter(
                    (roleName) =>
                        roleName.length > 0,
                ),
        ),
    ].sort();
}

// -----------------------------------------------------------------------------
// OPERATION EXECUTION
// -----------------------------------------------------------------------------

/**
 * Wraps provider failures in the stable Access adapter error model.
 *
 * Adapter-owned semantic and validation errors are preserved unchanged.
 */
async function executeBetterAuthOperation<TResult>(
    operation: string,
    execute: () => Promise<TResult>,
): Promise<TResult> {
    try {
        return await execute();
    }
    catch (error) {
        if (
            error
            instanceof BetterAuthAccessAdapterError
        ) {
            throw error;
        }

        throw new BetterAuthOperationFailedError(
            operation,
            error,
        );
    }
}

// -----------------------------------------------------------------------------
// BETTERAUTH ACCESS ADAPTER
// -----------------------------------------------------------------------------

/**
 * Creates the BetterAuth implementation of the AccessProvider contract.
 *
 * The adapter uses replacement semantics:
 *
 *   • Tenant Role synchronization sends the complete desired Permission map.
 *   • Membership synchronization sends the complete desired Role-name set.
 *
 * Replacement semantics ensure deterministic retries and prevent incremental
 * synchronization drift.
 *
 * BetterAuth does not currently expose existing member Role state through this
 * narrow adapter API. Consequently, Membership Role synchronization reports
 * `changed: true` when the desired-state update is successfully applied. It
 * does not claim that a prior provider state comparison occurred.
 */
export function createBetterAuthAccessAdapter(
    input: CreateBetterAuthAccessAdapterInput,
): AccessProvider {
    const {
        api,
        createHeaders,
        resolveMemberId,
    } = input;

    return {
        descriptor: {
            provider: "better-auth",

            displayName:
                "BetterAuth Organization Access Control",

            capabilities: {
                tenantRoleSynchronization: true,

                tenantRoleAssignmentSynchronization:
                    true,

                platformRoleSynchronization: false,

                systemRoleSynchronization: false,

                permissionCatalogSynchronization:
                    false,

                directPermissionAssignmentSynchronization:
                    false,

                authorizationStateInvalidation:
                    false,
            },
        },

        // ---------------------------------------------------------------------
        // TENANT ROLE SYNCHRONIZATION
        // ---------------------------------------------------------------------

        synchronizeTenantRole: async (
            roleInput: SynchronizeTenantRoleInput,
        ): Promise<AccessProviderOperationResult> =>
            executeBetterAuthOperation(
                "synchronize_tenant_role",
                async () => {
                    const roleName =
                        normalizeRoleName(
                            roleInput.name,
                        );

                    const desiredPermissions =
                        normalizePermissionMap(
                            roleInput.permissions,
                        );

                    const headers =
                        await createHeaders();

                    const existingRole =
                        await api.getOrgRole({
                            query: {
                                roleName,

                                organizationId:
                                    roleInput.tenantId,
                            },

                            headers,
                        });

                    if (
                        existingRole === null
                    ) {
                        const createdRole =
                            await api.createOrgRole({
                                body: {
                                    role: roleName,

                                    permission:
                                        desiredPermissions,

                                    organizationId:
                                        roleInput.tenantId,
                                },

                                headers,
                            });

                        return {
                            changed: true,

                            providerReference:
                                createdRole.id,
                        };
                    }

                    const existingPermissions =
                        parseBetterAuthPermissionMap(
                            existingRole.permission,
                        );

                    if (
                        permissionMapsEqual(
                            existingPermissions,
                            desiredPermissions,
                        )
                    ) {
                        return {
                            changed: false,

                            providerReference:
                                existingRole.id,
                        };
                    }

                    const updatedRole =
                        await api.updateOrgRole({
                            body: {
                                roleName,

                                organizationId:
                                    roleInput.tenantId,

                                data: {
                                    roleName,

                                    permission:
                                        desiredPermissions,
                                },
                            },

                            headers,
                        });

                    return {
                        changed: true,

                        providerReference:
                            updatedRole.id,
                    };
                },
            ),

        removeTenantRole: async (
            roleInput: RemoveTenantRoleInput,
        ): Promise<AccessProviderOperationResult> =>
            executeBetterAuthOperation(
                "remove_tenant_role",
                async () => {
                    const roleName =
                        normalizeRoleName(
                            roleInput.name,
                        );

                    const headers =
                        await createHeaders();

                    const existingRole =
                        await api.getOrgRole({
                            query: {
                                roleName,

                                organizationId:
                                    roleInput.tenantId,
                            },

                            headers,
                        });

                    if (
                        existingRole === null
                    ) {
                        return {
                            changed: false,
                        };
                    }

                    await api.deleteOrgRole({
                        body: {
                            roleName,

                            organizationId:
                                roleInput.tenantId,
                        },

                        headers,
                    });

                    return {
                        changed: true,

                        providerReference:
                            existingRole.id,
                    };
                },
            ),

        // ---------------------------------------------------------------------
        // TENANT ROLE ASSIGNMENT SYNCHRONIZATION
        // ---------------------------------------------------------------------

        synchronizeTenantRoleAssignments: async (
            assignmentInput:
                SynchronizeTenantRoleAssignmentsInput,
        ): Promise<AccessProviderOperationResult> =>
            executeBetterAuthOperation(
                "synchronize_tenant_role_assignments",
                async () => {
                    const memberId =
                        await resolveMemberId({
                            tenantId:
                                assignmentInput.tenantId,

                            membershipId:
                                assignmentInput.membershipId,

                            identityId:
                                assignmentInput.identityId,
                        });

                    if (
                        memberId === null
                        || memberId.trim().length === 0
                    ) {
                        throw new BetterAuthMemberNotFoundError(
                            assignmentInput.membershipId,
                        );
                    }

                    const roleNames =
                        normalizeRoleNames(
                            assignmentInput.roleNames,
                        );

                    const headers =
                        await createHeaders();

                    await api.updateMemberRole({
                        body: {
                            role: roleNames,

                            memberId:
                                memberId.trim(),

                            organizationId:
                                assignmentInput.tenantId,
                        },

                        headers,
                    });

                    return {
                        /*
                         * BetterAuth member state was successfully synchronized.
                         *
                         * The narrow API contract does not read the previous
                         * member Role set, so this value indicates that the
                         * synchronization operation was applied.
                         */
                        changed: true,

                        providerReference:
                            memberId.trim(),
                    };
                },
            ),

        // ---------------------------------------------------------------------
        // AUTHORIZATION-STATE INVALIDATION
        // ---------------------------------------------------------------------

        invalidateAuthorizationState: async (
            _invalidationInput:
                InvalidateProviderAuthorizationStateInput,
        ): Promise<AccessProviderOperationResult> => {
            throw new BetterAuthProviderCapabilityUnsupportedError(
                "authorization_state_invalidation",
            );
        },
    };
}