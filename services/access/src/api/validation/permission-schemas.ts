// services/access/src/api/validation/permission-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS PERMISSION SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation schemas for permission catalog API operations.
//
// Boundary:
//   • validates request and query shape only
//   • does not enforce catalog uniqueness
//   • does not determine whether a permission may be created or archived
//   • does not access canonical Access state
// -----------------------------------------------------------------------------

import type {
    ApiCreatePermissionRequest,
    ListPermissionsQuery,
    PermissionScope,
    PermissionStatus,
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
    accessKeySchema,
    accessNameSchema,
    accessSearchSchema,
    accessSortDirectionSchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
    parseAccessPagination,
} from "./common-schemas";

// -----------------------------------------------------------------------------
// ENUM SCHEMAS
// -----------------------------------------------------------------------------

const permissionScopes = [
    "platform",
    "tenant",
    "resource",
] as const;

const permissionStatuses = [
    "active",
    "archived",
] as const;

const permissionSortFields = [
    "key",
    "name",
    "createdAt",
] as const;

export const permissionScopeSchema =
    accessEnumSchema(
        permissionScopes,
    );

export const permissionStatusSchema =
    accessEnumSchema(
        permissionStatuses,
    );

export const permissionSortFieldSchema =
    accessEnumSchema(
        permissionSortFields,
    );

// -----------------------------------------------------------------------------
// CREATE PERMISSION
// -----------------------------------------------------------------------------

export const createPermissionRequestSchema =
    createAccessRequestSchema<ApiCreatePermissionRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiCreatePermissionRequest> => {
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
                        "scope",
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

            const scopeResult =
                permissionScopeSchema.parse(
                    input.scope,
                    accessValidationPath(
                        path,
                        "scope",
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
                !scopeResult.success
            ) {
                issues.push(
                    ...scopeResult.issues,
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
                !scopeResult.success
            ) {
                return accessValidationFailure(
                    scopeResult.issues,
                );
            }

            return accessValidationSuccess({
                key:
                    keyResult.value,

                name:
                    nameResult.value,

                description:
                    descriptionResult.value,

                scope:
                    scopeResult.value as PermissionScope,
            });
        },
    );

// -----------------------------------------------------------------------------
// LIST PERMISSIONS
// -----------------------------------------------------------------------------

export const listPermissionsQuerySchema =
    createAccessRequestSchema<ListPermissionsQuery>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ListPermissionsQuery> => {
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
                        "scope",
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

            const scopeResult =
                input.scope === undefined
                    ? accessValidationSuccess<PermissionScope | undefined>(
                        undefined,
                    )
                    : permissionScopeSchema.parse(
                        input.scope,
                        accessValidationPath(
                            path,
                            "scope",
                        ),
                    );

            const statusResult =
                input.status === undefined
                    ? accessValidationSuccess<PermissionStatus | undefined>(
                        undefined,
                    )
                    : permissionStatusSchema.parse(
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
                    ? accessValidationSuccess<
                        ListPermissionsQuery["sortBy"]
                    >(
                        undefined,
                    )
                    : permissionSortFieldSchema.parse(
                        input.sortBy,
                        accessValidationPath(
                            path,
                            "sortBy",
                        ),
                    );

            const sortDirectionResult =
                input.sortDirection === undefined
                    ? accessValidationSuccess<
                        ListPermissionsQuery["sortDirection"]
                    >(
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
                !scopeResult.success
            ) {
                issues.push(
                    ...scopeResult.issues,
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
                !scopeResult.success
            ) {
                return accessValidationFailure(
                    scopeResult.issues,
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
                scope:
                    scopeResult.value as PermissionScope | undefined,

                status:
                    statusResult.value as PermissionStatus | undefined,

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