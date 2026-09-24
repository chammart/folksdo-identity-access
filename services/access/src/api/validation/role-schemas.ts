// services/access/src/api/validation/role-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS ROLE SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation schemas for role definition API operations.
//
// Boundary:
//   • validates request and query structure
//   • does not enforce role lifecycle transitions
//   • does not validate referenced permissions against canonical state
//   • does not determine tenant or platform authorization
// -----------------------------------------------------------------------------

import type {
    ApiArchiveRoleRequest,
    ApiCreateRoleRequest,
    ListRolesQuery,
    ApiRestoreRoleRequest,
    RoleStatus,
    ApiRoleType,
    ApiUpdateRoleRequest,
} from "../dto";

import {
    createAccessRequestSchema,
    accessValidationFailure,
    accessValidationPath,
    accessValidationSuccess,
    type AccessValidationIssue,
    type AccessValidationResult,
} from "./access-validation";

import {
    accessDescriptionSchema,
    accessEnumSchema,
    accessIdentifierSchema,
    accessKeySchema,
    accessNameSchema,
    accessReasonSchema,
    accessSearchSchema,
    accessSortDirectionSchema,
    accessUniqueStringArraySchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
    parseAccessPagination,
} from "./common-schemas";

// -----------------------------------------------------------------------------
// ENUM SCHEMAS
// -----------------------------------------------------------------------------

const roleTypes = [
    "platform",
    "system",
    "tenant",
] as const;

const roleStatuses = [
    "active",
    "archived",
] as const;

const roleSortFields = [
    "key",
    "name",
    "createdAt",
    "updatedAt",
] as const;

export const roleTypeSchema =
    accessEnumSchema(
        roleTypes,
    );

export const roleStatusSchema =
    accessEnumSchema(
        roleStatuses,
    );

export const roleSortFieldSchema =
    accessEnumSchema(
        roleSortFields,
    );

const rolePermissionIdsSchema =
    accessUniqueStringArraySchema(
        accessIdentifierSchema,
        {
            maximumLength:
                500,
        },
    );

// -----------------------------------------------------------------------------
// CREATE ROLE
// -----------------------------------------------------------------------------

export const createRoleRequestSchema =
    createAccessRequestSchema<ApiCreateRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiCreateRoleRequest> => {
            const objectResult =
                parseAccessObject(
                    value,
                    path,
                );

            if (
                !objectResult.success
            ) {
                return objectResult;
            }

            const input =
                objectResult.value;

            const issues: AccessValidationIssue[] = [
                ...findUnknownAccessObjectFields(
                    input,
                    [
                        "key",
                        "name",
                        "description",
                        "type",
                        "tenantId",
                        "permissionIds",
                    ],
                    path,
                ),
            ];

            const keyResult =
                accessKeySchema.parse(
                    input.key,
                    accessValidationPath(
                        path,
                        "key",
                    ),
                );

            const nameResult =
                accessNameSchema.parse(
                    input.name,
                    accessValidationPath(
                        path,
                        "name",
                    ),
                );

            const descriptionResult =
                accessDescriptionSchema.parse(
                    input.description,
                    accessValidationPath(
                        path,
                        "description",
                    ),
                );

            const typeResult =
                roleTypeSchema.parse(
                    input.type,
                    accessValidationPath(
                        path,
                        "type",
                    ),
                );

            const tenantIdResult =
                input.tenantId === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessIdentifierSchema.parse(
                        input.tenantId,
                        accessValidationPath(
                            path,
                            "tenantId",
                        ),
                    );

            const permissionIdsResult =
                input.permissionIds === undefined
                    ? accessValidationSuccess<readonly string[] | undefined>(
                        undefined,
                    )
                    : rolePermissionIdsSchema.parse(
                        input.permissionIds,
                        accessValidationPath(
                            path,
                            "permissionIds",
                        ),
                    );

            if (
                !keyResult.success
            ) {
                issues.push(
                    ...keyResult.issues,
                );
            }

            if (
                !nameResult.success
            ) {
                issues.push(
                    ...nameResult.issues,
                );
            }

            if (
                !descriptionResult.success
            ) {
                issues.push(
                    ...descriptionResult.issues,
                );
            }

            if (
                !typeResult.success
            ) {
                issues.push(
                    ...typeResult.issues,
                );
            }

            if (
                !tenantIdResult.success
            ) {
                issues.push(
                    ...tenantIdResult.issues,
                );
            }

            if (
                !permissionIdsResult.success
            ) {
                issues.push(
                    ...permissionIdsResult.issues,
                );
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            if (
                !keyResult.success
            ) {
                return accessValidationFailure(
                    keyResult.issues,
                );
            }

            if (
                !nameResult.success
            ) {
                return accessValidationFailure(
                    nameResult.issues,
                );
            }

            if (
                !descriptionResult.success
            ) {
                return accessValidationFailure(
                    descriptionResult.issues,
                );
            }

            if (
                !typeResult.success
            ) {
                return accessValidationFailure(
                    typeResult.issues,
                );
            }

            if (
                !tenantIdResult.success
            ) {
                return accessValidationFailure(
                    tenantIdResult.issues,
                );
            }

            if (
                !permissionIdsResult.success
            ) {
                return accessValidationFailure(
                    permissionIdsResult.issues,
                );
            }

            return accessValidationSuccess({
                key:
                    keyResult.value,

                name:
                    nameResult.value,

                description:
                    descriptionResult.value,

                type:
                    typeResult.value as ApiRoleType,

                tenantId:
                    tenantIdResult.value,

                permissionIds:
                    permissionIdsResult.value,
            });
        },
    );

// -----------------------------------------------------------------------------
// UPDATE ROLE
// -----------------------------------------------------------------------------

export const updateRoleRequestSchema =
    createAccessRequestSchema<ApiUpdateRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiUpdateRoleRequest> => {
            const objectResult =
                parseAccessObject(
                    value,
                    path,
                );

            if (
                !objectResult.success
            ) {
                return objectResult;
            }

            const input =
                objectResult.value;

            const issues: AccessValidationIssue[] = [
                ...findUnknownAccessObjectFields(
                    input,
                    [
                        "roleId",
                        "name",
                        "description",
                        "permissionIds",
                    ],
                    path,
                ),
            ];

            const roleIdResult =
                accessIdentifierSchema.parse(
                    input.roleId,
                    accessValidationPath(
                        path,
                        "roleId",
                    ),
                );

            const nameResult =
                input.name === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessNameSchema.parse(
                        input.name,
                        accessValidationPath(
                            path,
                            "name",
                        ),
                    );

            const descriptionResult =
                input.description === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessDescriptionSchema.parse(
                        input.description,
                        accessValidationPath(
                            path,
                            "description",
                        ),
                    );

            const permissionIdsResult =
                input.permissionIds === undefined
                    ? accessValidationSuccess<readonly string[] | undefined>(
                        undefined,
                    )
                    : rolePermissionIdsSchema.parse(
                        input.permissionIds,
                        accessValidationPath(
                            path,
                            "permissionIds",
                        ),
                    );

            if (
                !roleIdResult.success
            ) {
                issues.push(
                    ...roleIdResult.issues,
                );
            }

            if (
                !nameResult.success
            ) {
                issues.push(
                    ...nameResult.issues,
                );
            }

            if (
                !descriptionResult.success
            ) {
                issues.push(
                    ...descriptionResult.issues,
                );
            }

            if (
                !permissionIdsResult.success
            ) {
                issues.push(
                    ...permissionIdsResult.issues,
                );
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            if (
                !roleIdResult.success
            ) {
                return accessValidationFailure(
                    roleIdResult.issues,
                );
            }

            if (
                !nameResult.success
            ) {
                return accessValidationFailure(
                    nameResult.issues,
                );
            }

            if (
                !descriptionResult.success
            ) {
                return accessValidationFailure(
                    descriptionResult.issues,
                );
            }

            if (
                !permissionIdsResult.success
            ) {
                return accessValidationFailure(
                    permissionIdsResult.issues,
                );
            }

            return accessValidationSuccess({
                roleId:
                    roleIdResult.value,

                name:
                    nameResult.value,

                description:
                    descriptionResult.value,

                permissionIds:
                    permissionIdsResult.value,
            });
        },
    );

// -----------------------------------------------------------------------------
// ARCHIVE ROLE
// -----------------------------------------------------------------------------

export const archiveRoleRequestSchema =
    createAccessRequestSchema<ApiArchiveRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiArchiveRoleRequest> =>
            parseRoleLifecycleRequest(
                value,
                path,
            ),
    );

// -----------------------------------------------------------------------------
// RESTORE ROLE
// -----------------------------------------------------------------------------

export const restoreRoleRequestSchema =
    createAccessRequestSchema<ApiRestoreRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiRestoreRoleRequest> =>
            parseRoleLifecycleRequest(
                value,
                path,
            ),
    );

function parseRoleLifecycleRequest(
    value: unknown,
    path: string,
): AccessValidationResult<ApiArchiveRoleRequest> {
    const objectResult =
        parseAccessObject(
            value,
            path,
        );

    if (
        !objectResult.success
    ) {
        return objectResult;
    }

    const input =
        objectResult.value;

    const issues: AccessValidationIssue[] = [
        ...findUnknownAccessObjectFields(
            input,
            [
                "roleId",
                "reason",
            ],
            path,
        ),
    ];

    const roleIdResult =
        accessIdentifierSchema.parse(
            input.roleId,
            accessValidationPath(
                path,
                "roleId",
            ),
        );

    const reasonResult =
        input.reason === undefined
            ? accessValidationSuccess<string | undefined>(
                undefined,
            )
            : accessReasonSchema.parse(
                input.reason,
                accessValidationPath(
                    path,
                    "reason",
                ),
            );

    if (
        !roleIdResult.success
    ) {
        issues.push(
            ...roleIdResult.issues,
        );
    }

    if (
        !reasonResult.success
    ) {
        issues.push(
            ...reasonResult.issues,
        );
    }

    if (
        issues.length > 0
    ) {
        return accessValidationFailure(
            issues,
        );
    }

    if (
        !roleIdResult.success
    ) {
        return accessValidationFailure(
            roleIdResult.issues,
        );
    }

    if (
        !reasonResult.success
    ) {
        return accessValidationFailure(
            reasonResult.issues,
        );
    }

    return accessValidationSuccess({
        roleId:
            roleIdResult.value,

        reason:
            reasonResult.value,
    });
}

// -----------------------------------------------------------------------------
// LIST ROLES
// -----------------------------------------------------------------------------

export const listRolesQuerySchema =
    createAccessRequestSchema<ListRolesQuery>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ListRolesQuery> => {
            const objectResult =
                parseAccessObject(
                    value,
                    path,
                );

            if (
                !objectResult.success
            ) {
                return objectResult;
            }

            const input =
                objectResult.value;

            const issues: AccessValidationIssue[] = [
                ...findUnknownAccessObjectFields(
                    input,
                    [
                        "tenantId",
                        "type",
                        "status",
                        "search",
                        "limit",
                        "offset",
                        "sortBy",
                        "sortDirection",
                    ],
                    path,
                ),
            ];

            const tenantIdResult =
                input.tenantId === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessIdentifierSchema.parse(
                        input.tenantId,
                        accessValidationPath(
                            path,
                            "tenantId",
                        ),
                    );

            const typeResult =
                input.type === undefined
                    ? accessValidationSuccess<ApiRoleType | undefined>(
                        undefined,
                    )
                    : roleTypeSchema.parse(
                        input.type,
                        accessValidationPath(
                            path,
                            "type",
                        ),
                    );

            const statusResult =
                input.status === undefined
                    ? accessValidationSuccess<RoleStatus | undefined>(
                        undefined,
                    )
                    : roleStatusSchema.parse(
                        input.status,
                        accessValidationPath(
                            path,
                            "status",
                        ),
                    );

            const searchResult =
                input.search === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessSearchSchema.parse(
                        input.search,
                        accessValidationPath(
                            path,
                            "search",
                        ),
                    );

            const sortByResult =
                input.sortBy === undefined
                    ? accessValidationSuccess<ListRolesQuery["sortBy"]>(
                        undefined,
                    )
                    : roleSortFieldSchema.parse(
                        input.sortBy,
                        accessValidationPath(
                            path,
                            "sortBy",
                        ),
                    );

            const sortDirectionResult =
                input.sortDirection === undefined
                    ? accessValidationSuccess<ListRolesQuery["sortDirection"]>(
                        undefined,
                    )
                    : accessSortDirectionSchema.parse(
                        input.sortDirection,
                        accessValidationPath(
                            path,
                            "sortDirection",
                        ),
                    );

            const paginationResult =
                parseAccessPagination(
                    input,
                    path,
                );

            if (
                !tenantIdResult.success
            ) {
                issues.push(
                    ...tenantIdResult.issues,
                );
            }

            if (
                !typeResult.success
            ) {
                issues.push(
                    ...typeResult.issues,
                );
            }

            if (
                !statusResult.success
            ) {
                issues.push(
                    ...statusResult.issues,
                );
            }

            if (
                !searchResult.success
            ) {
                issues.push(
                    ...searchResult.issues,
                );
            }

            if (
                !sortByResult.success
            ) {
                issues.push(
                    ...sortByResult.issues,
                );
            }

            if (
                !sortDirectionResult.success
            ) {
                issues.push(
                    ...sortDirectionResult.issues,
                );
            }

            if (
                !paginationResult.success
            ) {
                issues.push(
                    ...paginationResult.issues,
                );
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            if (
                !tenantIdResult.success
            ) {
                return accessValidationFailure(
                    tenantIdResult.issues,
                );
            }

            if (
                !typeResult.success
            ) {
                return accessValidationFailure(
                    typeResult.issues,
                );
            }

            if (
                !statusResult.success
            ) {
                return accessValidationFailure(
                    statusResult.issues,
                );
            }

            if (
                !searchResult.success
            ) {
                return accessValidationFailure(
                    searchResult.issues,
                );
            }

            if (
                !sortByResult.success
            ) {
                return accessValidationFailure(
                    sortByResult.issues,
                );
            }

            if (
                !sortDirectionResult.success
            ) {
                return accessValidationFailure(
                    sortDirectionResult.issues,
                );
            }

            if (
                !paginationResult.success
            ) {
                return accessValidationFailure(
                    paginationResult.issues,
                );
            }

            return accessValidationSuccess({
                tenantId:
                    tenantIdResult.value,

                type:
                    typeResult.value as ApiRoleType | undefined,

                status:
                    statusResult.value as RoleStatus | undefined,

                search:
                    searchResult.value,

                limit:
                    paginationResult.value.limit,

                offset:
                    paginationResult.value.offset,

                sortBy:
                    sortByResult.value,

                sortDirection:
                    sortDirectionResult.value,
            });
        },
    );