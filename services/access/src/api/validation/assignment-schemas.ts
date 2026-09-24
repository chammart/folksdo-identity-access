// services/access/src/api/validation/assignment-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS ASSIGNMENT SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation schemas for role and permission assignment operations.
//
// Boundary:
//   • validates identifiers, enums, dates and structural fields
//   • does not resolve Membership eligibility
//   • does not validate referenced roles or permissions
//   • does not determine permission precedence
// -----------------------------------------------------------------------------

import type {
    ApiAssignRoleRequest,
    ApiGrantPermissionRequest,
    ListPermissionAssignmentsQuery,
    ListRoleAssignmentsQuery,
    PermissionAssignmentEffect,
    ApiPermissionAssignmentStatus,
    PermissionAssignmentSubjectType,
    ApiRemoveRoleRequest,
    ApiRevokePermissionRequest,
    ApiRoleAssignmentStatus,
    RoleAssignmentSubjectType,
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
    accessEnumSchema,
    accessIdentifierSchema,
    accessIsoDateTimeSchema,
    accessReasonSchema,
    accessSortDirectionSchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
    parseAccessPagination,
    type AccessUnknownObject,
} from "./common-schemas";

// -----------------------------------------------------------------------------
// ENUM SCHEMAS
// -----------------------------------------------------------------------------

const assignmentSubjectTypes = [
    "identity",
    "membership",
] as const;

const roleAssignmentStatuses = [
    "pending",
    "active",
    "suspended",
    "expired",
    "archived",
    "removed",
] as const;

const permissionAssignmentStatuses = [
    "pending",
    "active",
    "suspended",
    "expired",
    "archived",
    "revoked",
] as const;

const permissionAssignmentEffects = [
    "grant",
    "deny",
] as const;

const permissionAssignmentScopes = [
    "tenant",
    "resource",
] as const;

const assignmentSortFields = [
    "assignedAt",
    "expiresAt",
    "updatedAt",
] as const;

export const assignmentSubjectTypeSchema =
    accessEnumSchema(
        assignmentSubjectTypes,
    );

export const roleAssignmentStatusSchema =
    accessEnumSchema(
        roleAssignmentStatuses,
    );

export const permissionAssignmentStatusSchema =
    accessEnumSchema(
        permissionAssignmentStatuses,
    );

export const permissionAssignmentEffectSchema =
    accessEnumSchema(
        permissionAssignmentEffects,
    );

export const permissionAssignmentScopeSchema =
    accessEnumSchema(
        permissionAssignmentScopes,
    );

export const assignmentSortFieldSchema =
    accessEnumSchema(
        assignmentSortFields,
    );

// -----------------------------------------------------------------------------
// ASSIGN ROLE
// -----------------------------------------------------------------------------

export const assignRoleRequestSchema =
    createAccessRequestSchema<ApiAssignRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiAssignRoleRequest> => {
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
                        "subjectType",
                        "subjectId",
                        "identityId",
                        "membershipId",
                        "tenantId",
                        "expiresAt",
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

            const subjectTypeResult =
                assignmentSubjectTypeSchema.parse(
                    input.subjectType,
                    accessValidationPath(
                        path,
                        "subjectType",
                    ),
                );

            const subjectIdResult =
                accessIdentifierSchema.parse(
                    input.subjectId,
                    accessValidationPath(
                        path,
                        "subjectId",
                    ),
                );

            const identityIdResult =
                parseOptionalIdentifier(
                    input,
                    "identityId",
                    path,
                );

            const membershipIdResult =
                parseOptionalIdentifier(
                    input,
                    "membershipId",
                    path,
                );

            const tenantIdResult =
                parseOptionalIdentifier(
                    input,
                    "tenantId",
                    path,
                );

            const expiresAtResult =
                input.expiresAt === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessIsoDateTimeSchema.parse(
                        input.expiresAt,
                        accessValidationPath(
                            path,
                            "expiresAt",
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
                !subjectTypeResult.success
            ) {
                issues.push(
                    ...subjectTypeResult.issues,
                );
            }

            if (
                !subjectIdResult.success
            ) {
                issues.push(
                    ...subjectIdResult.issues,
                );
            }

            if (
                !identityIdResult.success
            ) {
                issues.push(
                    ...identityIdResult.issues,
                );
            }

            if (
                !membershipIdResult.success
            ) {
                issues.push(
                    ...membershipIdResult.issues,
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
                !expiresAtResult.success
            ) {
                issues.push(
                    ...expiresAtResult.issues,
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
                !subjectTypeResult.success
            ) {
                return accessValidationFailure(
                    subjectTypeResult.issues,
                );
            }

            if (
                !subjectIdResult.success
            ) {
                return accessValidationFailure(
                    subjectIdResult.issues,
                );
            }

            if (
                !identityIdResult.success
            ) {
                return accessValidationFailure(
                    identityIdResult.issues,
                );
            }

            if (
                !membershipIdResult.success
            ) {
                return accessValidationFailure(
                    membershipIdResult.issues,
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
                !expiresAtResult.success
            ) {
                return accessValidationFailure(
                    expiresAtResult.issues,
                );
            }

            return accessValidationSuccess({
                roleId:
                    roleIdResult.value,

                subjectType:
                    subjectTypeResult.value as RoleAssignmentSubjectType,

                subjectId:
                    subjectIdResult.value,

                identityId:
                    identityIdResult.value,

                membershipId:
                    membershipIdResult.value,

                tenantId:
                    tenantIdResult.value,

                expiresAt:
                    expiresAtResult.value,
            });
        },
    );

// -----------------------------------------------------------------------------
// REMOVE ROLE ASSIGNMENT
// -----------------------------------------------------------------------------

export const removeRoleRequestSchema =
    createAccessRequestSchema<ApiRemoveRoleRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiRemoveRoleRequest> =>
            parseAssignmentLifecycleRequest(
                value,
                path,
            ),
    );

// -----------------------------------------------------------------------------
// GRANT PERMISSION
// -----------------------------------------------------------------------------

export const grantPermissionRequestSchema =
    createAccessRequestSchema<ApiGrantPermissionRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiGrantPermissionRequest> => {
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
                        "permissionId",
                        "subjectType",
                        "subjectId",
                        "identityId",
                        "membershipId",
                        "tenantId",
                        "effect",
                        "scope",
                        "resource",
                        "expiresAt",
                    ],
                    path,
                ),
            ];

            const permissionIdResult =
                accessIdentifierSchema.parse(
                    input.permissionId,
                    accessValidationPath(
                        path,
                        "permissionId",
                    ),
                );

            const subjectTypeResult =
                assignmentSubjectTypeSchema.parse(
                    input.subjectType,
                    accessValidationPath(
                        path,
                        "subjectType",
                    ),
                );

            const subjectIdResult =
                accessIdentifierSchema.parse(
                    input.subjectId,
                    accessValidationPath(
                        path,
                        "subjectId",
                    ),
                );

            const identityIdResult =
                parseOptionalIdentifier(
                    input,
                    "identityId",
                    path,
                );

            const membershipIdResult =
                parseOptionalIdentifier(
                    input,
                    "membershipId",
                    path,
                );

            const tenantIdResult =
                parseOptionalIdentifier(
                    input,
                    "tenantId",
                    path,
                );

            const effectResult =
                permissionAssignmentEffectSchema.parse(
                    input.effect,
                    accessValidationPath(
                        path,
                        "effect",
                    ),
                );

            const scopeResult =
                permissionAssignmentScopeSchema.parse(
                    input.scope,
                    accessValidationPath(
                        path,
                        "scope",
                    ),
                );

            const resourceResult =
                input.resource === undefined
                    ? accessValidationSuccess<
                        ApiGrantPermissionRequest["resource"]
                    >(
                        undefined,
                    )
                    : parseAssignmentResource(
                        input.resource,
                        accessValidationPath(
                            path,
                            "resource",
                        ),
                    );

            const expiresAtResult =
                input.expiresAt === undefined
                    ? accessValidationSuccess<string | undefined>(
                        undefined,
                    )
                    : accessIsoDateTimeSchema.parse(
                        input.expiresAt,
                        accessValidationPath(
                            path,
                            "expiresAt",
                        ),
                    );

            if (
                !permissionIdResult.success
            ) {
                issues.push(
                    ...permissionIdResult.issues,
                );
            }

            if (
                !subjectTypeResult.success
            ) {
                issues.push(
                    ...subjectTypeResult.issues,
                );
            }

            if (
                !subjectIdResult.success
            ) {
                issues.push(
                    ...subjectIdResult.issues,
                );
            }

            if (
                !identityIdResult.success
            ) {
                issues.push(
                    ...identityIdResult.issues,
                );
            }

            if (
                !membershipIdResult.success
            ) {
                issues.push(
                    ...membershipIdResult.issues,
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
                !effectResult.success
            ) {
                issues.push(
                    ...effectResult.issues,
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
                !resourceResult.success
            ) {
                issues.push(
                    ...resourceResult.issues,
                );
            }

            if (
                !expiresAtResult.success
            ) {
                issues.push(
                    ...expiresAtResult.issues,
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
                !permissionIdResult.success
            ) {
                return accessValidationFailure(
                    permissionIdResult.issues,
                );
            }

            if (
                !subjectTypeResult.success
            ) {
                return accessValidationFailure(
                    subjectTypeResult.issues,
                );
            }

            if (
                !subjectIdResult.success
            ) {
                return accessValidationFailure(
                    subjectIdResult.issues,
                );
            }

            if (
                !identityIdResult.success
            ) {
                return accessValidationFailure(
                    identityIdResult.issues,
                );
            }

            if (
                !membershipIdResult.success
            ) {
                return accessValidationFailure(
                    membershipIdResult.issues,
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
                !effectResult.success
            ) {
                return accessValidationFailure(
                    effectResult.issues,
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
                !resourceResult.success
            ) {
                return accessValidationFailure(
                    resourceResult.issues,
                );
            }

            if (
                !expiresAtResult.success
            ) {
                return accessValidationFailure(
                    expiresAtResult.issues,
                );
            }

            return accessValidationSuccess({
                permissionId:
                    permissionIdResult.value,

                subjectType:
                    subjectTypeResult.value as PermissionAssignmentSubjectType,

                subjectId:
                    subjectIdResult.value,

                identityId:
                    identityIdResult.value,

                membershipId:
                    membershipIdResult.value,

                tenantId:
                    tenantIdResult.value,

                effect:
                    effectResult.value as PermissionAssignmentEffect,

                scope:
                    scopeResult.value,

                resource:
                    resourceResult.value,

                expiresAt:
                    expiresAtResult.value,
            });
        },
    );

// -----------------------------------------------------------------------------
// REVOKE PERMISSION ASSIGNMENT
// -----------------------------------------------------------------------------

export const revokePermissionRequestSchema =
    createAccessRequestSchema<ApiRevokePermissionRequest>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ApiRevokePermissionRequest> =>
            parseAssignmentLifecycleRequest(
                value,
                path,
            ),
    );

// -----------------------------------------------------------------------------
// LIST ROLE ASSIGNMENTS
// -----------------------------------------------------------------------------

export const listRoleAssignmentsQuerySchema =
    createAccessRequestSchema<ListRoleAssignmentsQuery>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ListRoleAssignmentsQuery> =>
            parseRoleAssignmentsQuery(
                value,
                path,
            ),
    );

// -----------------------------------------------------------------------------
// LIST PERMISSION ASSIGNMENTS
// -----------------------------------------------------------------------------

export const listPermissionAssignmentsQuerySchema =
    createAccessRequestSchema<ListPermissionAssignmentsQuery>(
        (
            value: unknown,
            path: string,
        ): AccessValidationResult<ListPermissionAssignmentsQuery> =>
            parsePermissionAssignmentsQuery(
                value,
                path,
            ),
    );

// -----------------------------------------------------------------------------
// SHARED LIFECYCLE REQUEST
// -----------------------------------------------------------------------------

function parseAssignmentLifecycleRequest(
    value: unknown,
    path: string,
): AccessValidationResult<ApiRemoveRoleRequest> {
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
                "assignmentId",
                "reason",
            ],
            path,
        ),
    ];

    const assignmentIdResult =
        accessIdentifierSchema.parse(
            input.assignmentId,
            accessValidationPath(
                path,
                "assignmentId",
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
        !assignmentIdResult.success
    ) {
        issues.push(
            ...assignmentIdResult.issues,
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
        !assignmentIdResult.success
    ) {
        return accessValidationFailure(
            assignmentIdResult.issues,
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
        assignmentId:
            assignmentIdResult.value,

        reason:
            reasonResult.value,
    });
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT QUERY PARSER
// -----------------------------------------------------------------------------

function parseRoleAssignmentsQuery(
    value: unknown,
    path: string,
): AccessValidationResult<ListRoleAssignmentsQuery> {
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
                "subjectType",
                "subjectId",
                "identityId",
                "membershipId",
                "tenantId",
                "status",
                "expiresBefore",
                "limit",
                "offset",
                "sortBy",
                "sortDirection",
            ],
            path,
        ),
    ];

    const commonResult =
        parseAssignmentQueryFields(
            input,
            path,
        );

    const roleIdResult =
        parseOptionalIdentifier(
            input,
            "roleId",
            path,
        );

    const statusResult =
        input.status === undefined
            ? accessValidationSuccess<ApiRoleAssignmentStatus | undefined>(
                undefined,
            )
            : roleAssignmentStatusSchema.parse(
                input.status,
                accessValidationPath(
                    path,
                    "status",
                ),
            );

    if (
        !commonResult.success
    ) {
        issues.push(
            ...commonResult.issues,
        );
    }

    if (
        !roleIdResult.success
    ) {
        issues.push(
            ...roleIdResult.issues,
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
        issues.length > 0
    ) {
        return accessValidationFailure(
            issues,
        );
    }

    if (
        !commonResult.success
    ) {
        return accessValidationFailure(
            commonResult.issues,
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
        !statusResult.success
    ) {
        return accessValidationFailure(
            statusResult.issues,
        );
    }

    return accessValidationSuccess({
        roleId:
            roleIdResult.value,

        subjectType:
            commonResult.value.subjectType as RoleAssignmentSubjectType | undefined,

        subjectId:
            commonResult.value.subjectId,

        identityId:
            commonResult.value.identityId,

        membershipId:
            commonResult.value.membershipId,

        tenantId:
            commonResult.value.tenantId,

        status:
            statusResult.value as ApiRoleAssignmentStatus | undefined,

        expiresBefore:
            commonResult.value.expiresBefore,

        limit:
            commonResult.value.limit,

        offset:
            commonResult.value.offset,

        sortBy:
            commonResult.value.sortBy,

        sortDirection:
            commonResult.value.sortDirection,
    });
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT QUERY PARSER
// -----------------------------------------------------------------------------

function parsePermissionAssignmentsQuery(
    value: unknown,
    path: string,
): AccessValidationResult<ListPermissionAssignmentsQuery> {
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
                "permissionId",
                "subjectType",
                "subjectId",
                "identityId",
                "membershipId",
                "tenantId",
                "effect",
                "status",
                "expiresBefore",
                "limit",
                "offset",
                "sortBy",
                "sortDirection",
            ],
            path,
        ),
    ];

    const commonResult =
        parseAssignmentQueryFields(
            input,
            path,
        );

    const permissionIdResult =
        parseOptionalIdentifier(
            input,
            "permissionId",
            path,
        );

    const effectResult =
        input.effect === undefined
            ? accessValidationSuccess<PermissionAssignmentEffect | undefined>(
                undefined,
            )
            : permissionAssignmentEffectSchema.parse(
                input.effect,
                accessValidationPath(
                    path,
                    "effect",
                ),
            );

    const statusResult =
        input.status === undefined
            ? accessValidationSuccess<ApiPermissionAssignmentStatus | undefined>(
                undefined,
            )
            : permissionAssignmentStatusSchema.parse(
                input.status,
                accessValidationPath(
                    path,
                    "status",
                ),
            );

    if (
        !commonResult.success
    ) {
        issues.push(
            ...commonResult.issues,
        );
    }

    if (
        !permissionIdResult.success
    ) {
        issues.push(
            ...permissionIdResult.issues,
        );
    }

    if (
        !effectResult.success
    ) {
        issues.push(
            ...effectResult.issues,
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
        issues.length > 0
    ) {
        return accessValidationFailure(
            issues,
        );
    }

    if (
        !commonResult.success
    ) {
        return accessValidationFailure(
            commonResult.issues,
        );
    }

    if (
        !permissionIdResult.success
    ) {
        return accessValidationFailure(
            permissionIdResult.issues,
        );
    }

    if (
        !effectResult.success
    ) {
        return accessValidationFailure(
            effectResult.issues,
        );
    }

    if (
        !statusResult.success
    ) {
        return accessValidationFailure(
            statusResult.issues,
        );
    }

    return accessValidationSuccess({
        permissionId:
            permissionIdResult.value,

        subjectType:
            commonResult.value.subjectType as PermissionAssignmentSubjectType | undefined,

        subjectId:
            commonResult.value.subjectId,

        identityId:
            commonResult.value.identityId,

        membershipId:
            commonResult.value.membershipId,

        tenantId:
            commonResult.value.tenantId,

        effect:
            effectResult.value as PermissionAssignmentEffect | undefined,

        status:
            statusResult.value as ApiPermissionAssignmentStatus | undefined,

        expiresBefore:
            commonResult.value.expiresBefore,

        limit:
            commonResult.value.limit,

        offset:
            commonResult.value.offset,

        sortBy:
            commonResult.value.sortBy,

        sortDirection:
            commonResult.value.sortDirection,
    });
}

// -----------------------------------------------------------------------------
// SHARED ASSIGNMENT QUERY FIELDS
// -----------------------------------------------------------------------------

interface ParsedAssignmentQueryFields {
    readonly subjectType?:
    typeof assignmentSubjectTypes[number];

    readonly subjectId?: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    readonly expiresBefore?: string;

    readonly limit?: number;

    readonly offset?: number;

    readonly sortBy?:
    typeof assignmentSortFields[number];

    readonly sortDirection?:
    "asc" | "desc";
}

function parseAssignmentQueryFields(
    input: AccessUnknownObject,
    path: string,
): AccessValidationResult<ParsedAssignmentQueryFields> {
    const subjectTypeResult =
        input.subjectType === undefined
            ? accessValidationSuccess<
                ParsedAssignmentQueryFields["subjectType"]
            >(
                undefined,
            )
            : assignmentSubjectTypeSchema.parse(
                input.subjectType,
                accessValidationPath(
                    path,
                    "subjectType",
                ),
            );

    const subjectIdResult =
        parseOptionalIdentifier(
            input,
            "subjectId",
            path,
        );

    const identityIdResult =
        parseOptionalIdentifier(
            input,
            "identityId",
            path,
        );

    const membershipIdResult =
        parseOptionalIdentifier(
            input,
            "membershipId",
            path,
        );

    const tenantIdResult =
        parseOptionalIdentifier(
            input,
            "tenantId",
            path,
        );

    const expiresBeforeResult =
        input.expiresBefore === undefined
            ? accessValidationSuccess<string | undefined>(
                undefined,
            )
            : accessIsoDateTimeSchema.parse(
                input.expiresBefore,
                accessValidationPath(
                    path,
                    "expiresBefore",
                ),
            );

    const sortByResult =
        input.sortBy === undefined
            ? accessValidationSuccess<
                ParsedAssignmentQueryFields["sortBy"]
            >(
                undefined,
            )
            : assignmentSortFieldSchema.parse(
                input.sortBy,
                accessValidationPath(
                    path,
                    "sortBy",
                ),
            );

    const sortDirectionResult =
        input.sortDirection === undefined
            ? accessValidationSuccess<
                ParsedAssignmentQueryFields["sortDirection"]
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

    const issues: AccessValidationIssue[] =
        [];

    if (
        !subjectTypeResult.success
    ) {
        issues.push(
            ...subjectTypeResult.issues,
        );
    }

    if (
        !subjectIdResult.success
    ) {
        issues.push(
            ...subjectIdResult.issues,
        );
    }

    if (
        !identityIdResult.success
    ) {
        issues.push(
            ...identityIdResult.issues,
        );
    }

    if (
        !membershipIdResult.success
    ) {
        issues.push(
            ...membershipIdResult.issues,
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
        !expiresBeforeResult.success
    ) {
        issues.push(
            ...expiresBeforeResult.issues,
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
        !subjectTypeResult.success
    ) {
        return accessValidationFailure(
            subjectTypeResult.issues,
        );
    }

    if (
        !subjectIdResult.success
    ) {
        return accessValidationFailure(
            subjectIdResult.issues,
        );
    }

    if (
        !identityIdResult.success
    ) {
        return accessValidationFailure(
            identityIdResult.issues,
        );
    }

    if (
        !membershipIdResult.success
    ) {
        return accessValidationFailure(
            membershipIdResult.issues,
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
        !expiresBeforeResult.success
    ) {
        return accessValidationFailure(
            expiresBeforeResult.issues,
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
        subjectType:
            subjectTypeResult.value,

        subjectId:
            subjectIdResult.value,

        identityId:
            identityIdResult.value,

        membershipId:
            membershipIdResult.value,

        tenantId:
            tenantIdResult.value,

        expiresBefore:
            expiresBeforeResult.value,

        limit:
            paginationResult.value.limit,

        offset:
            paginationResult.value.offset,

        sortBy:
            sortByResult.value,

        sortDirection:
            sortDirectionResult.value,
    });
}

// -----------------------------------------------------------------------------
// RESOURCE PARSER
// -----------------------------------------------------------------------------

function parseAssignmentResource(
    value: unknown,
    path: string,
): AccessValidationResult<
    NonNullable<ApiGrantPermissionRequest["resource"]>
> {
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
                "type",
                "id",
            ],
            path,
        ),
    ];

    const typeResult =
        accessIdentifierSchema.parse(
            input.type,
            accessValidationPath(
                path,
                "type",
            ),
        );

    const idResult =
        accessIdentifierSchema.parse(
            input.id,
            accessValidationPath(
                path,
                "id",
            ),
        );

    if (
        !typeResult.success
    ) {
        issues.push(
            ...typeResult.issues,
        );
    }

    if (
        !idResult.success
    ) {
        issues.push(
            ...idResult.issues,
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
        !typeResult.success
    ) {
        return accessValidationFailure(
            typeResult.issues,
        );
    }

    if (
        !idResult.success
    ) {
        return accessValidationFailure(
            idResult.issues,
        );
    }

    return accessValidationSuccess({
        type:
            typeResult.value,

        id:
            idResult.value,
    });
}

// -----------------------------------------------------------------------------
// OPTIONAL IDENTIFIER
// -----------------------------------------------------------------------------

function parseOptionalIdentifier(
    input: AccessUnknownObject,
    field: string,
    path: string,
): AccessValidationResult<string | undefined> {
    const value =
        input[field];

    if (
        value === undefined
    ) {
        return accessValidationSuccess(
            undefined,
        );
    }

    return accessIdentifierSchema.parse(
        value,
        accessValidationPath(
            path,
            field,
        ),
    );
}