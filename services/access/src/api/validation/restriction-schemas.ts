// services/access/src/api/validation/restriction-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS RESTRICTION SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation schemas for explicit Access restriction operations.
// -----------------------------------------------------------------------------

import type {
    ApiCreateRestrictionRequest,
    ApiRemoveRestrictionRequest,
    ListRestrictionsQuery,
} from "../dto";

import {
    accessValidationFailure,
    accessValidationPath,
    accessValidationSuccess,
    createAccessRequestSchema,
    type AccessValidationIssue,
} from "./access-validation";

import {
    accessEnumSchema,
    accessIdentifierSchema,
    accessIsoDateTimeSchema,
    accessReasonSchema,
    accessSortDirectionSchema,
    accessStringSchema,
    accessUniqueStringArraySchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
    parseAccessPagination,
} from "./common-schemas";

const restrictionTargetTypeSchema = accessEnumSchema(["membership", "tenant", "role", "permission", "resource"] as const);
const restrictionSubjectTypeSchema = accessEnumSchema(["identity", "membership"] as const);
const restrictionScopeSchema = accessEnumSchema(["platform", "tenant"] as const);
const restrictionStatusSchema = accessEnumSchema(["active", "expired", "removed"] as const);
const restrictionSortFieldSchema = accessEnumSchema(["createdAt", "expiresAt", "updatedAt"] as const);
const permissionKeysSchema = accessUniqueStringArraySchema(
    accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }),
    { maximumLength: 500 },
);

export const createRestrictionRequestSchema = createAccessRequestSchema<ApiCreateRestrictionRequest>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["targetType", "targetId", "tenantId", "permissionKeys", "resource", "reasonCode", "description", "expiresAt"], path)];
    const checks = [
        restrictionTargetTypeSchema.parse(input.targetType, accessValidationPath(path, "targetType")),
        accessIdentifierSchema.parse(input.targetId, accessValidationPath(path, "targetId")),
        ...(input.tenantId === undefined ? [] : [accessIdentifierSchema.parse(input.tenantId, accessValidationPath(path, "tenantId"))]),
        ...(input.permissionKeys === undefined ? [] : [permissionKeysSchema.parse(input.permissionKeys, accessValidationPath(path, "permissionKeys"))]),
        accessReasonSchema.parse(input.reasonCode, accessValidationPath(path, "reasonCode")),
        ...(input.description === undefined ? [] : [accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 2000 }).parse(input.description, accessValidationPath(path, "description"))]),
        ...(input.expiresAt === undefined ? [] : [accessIsoDateTimeSchema.parse(input.expiresAt, accessValidationPath(path, "expiresAt"))]),
    ];
    if (input.resource !== undefined) {
        const resource = parseAccessObject(input.resource, accessValidationPath(path, "resource"));
        if (!resource.success) issues.push(...resource.issues);
        else {
            issues.push(...findUnknownAccessObjectFields(resource.value, ["type", "id"], accessValidationPath(path, "resource")));
            const type = accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }).parse(resource.value.type, accessValidationPath(path, "resource.type"));
            const id = resource.value.id === undefined ? accessValidationSuccess(undefined) : accessIdentifierSchema.parse(resource.value.id, accessValidationPath(path, "resource.id"));
            if (!type.success) issues.push(...type.issues);
            if (!id.success) issues.push(...id.issues);
        }
    }
    for (const result of checks) if (!result.success) issues.push(...result.issues);
    return issues.length > 0 ? accessValidationFailure(issues) : accessValidationSuccess(input as unknown as ApiCreateRestrictionRequest);
});

export const removeRestrictionRequestSchema = createAccessRequestSchema<ApiRemoveRestrictionRequest>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["restrictionId", "reason"], path)];
    const restrictionId = accessIdentifierSchema.parse(input.restrictionId, accessValidationPath(path, "restrictionId"));
    const reason = input.reason === undefined ? accessValidationSuccess(undefined) : accessReasonSchema.parse(input.reason, accessValidationPath(path, "reason"));
    if (!restrictionId.success) issues.push(...restrictionId.issues);
    if (!reason.success) issues.push(...reason.issues);
    return issues.length > 0 ? accessValidationFailure(issues) : accessValidationSuccess(input as unknown as ApiRemoveRestrictionRequest);
});

export const listRestrictionsQuerySchema = createAccessRequestSchema<ListRestrictionsQuery>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["subjectType", "subjectId", "identityId", "membershipId", "tenantId", "scope", "status", "permissionKey", "resourceType", "expiresBefore", "limit", "offset", "sortBy", "sortDirection"], path)];
    const checks = [
        ...(input.subjectType === undefined ? [] : [restrictionSubjectTypeSchema.parse(input.subjectType, accessValidationPath(path, "subjectType"))]),
        ...(input.subjectId === undefined ? [] : [accessIdentifierSchema.parse(input.subjectId, accessValidationPath(path, "subjectId"))]),
        ...(input.identityId === undefined ? [] : [accessIdentifierSchema.parse(input.identityId, accessValidationPath(path, "identityId"))]),
        ...(input.membershipId === undefined ? [] : [accessIdentifierSchema.parse(input.membershipId, accessValidationPath(path, "membershipId"))]),
        ...(input.tenantId === undefined ? [] : [accessIdentifierSchema.parse(input.tenantId, accessValidationPath(path, "tenantId"))]),
        ...(input.scope === undefined ? [] : [restrictionScopeSchema.parse(input.scope, accessValidationPath(path, "scope"))]),
        ...(input.status === undefined ? [] : [restrictionStatusSchema.parse(input.status, accessValidationPath(path, "status"))]),
        ...(input.permissionKey === undefined ? [] : [accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }).parse(input.permissionKey, accessValidationPath(path, "permissionKey"))]),
        ...(input.resourceType === undefined ? [] : [accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }).parse(input.resourceType, accessValidationPath(path, "resourceType"))]),
        ...(input.expiresBefore === undefined ? [] : [accessIsoDateTimeSchema.parse(input.expiresBefore, accessValidationPath(path, "expiresBefore"))]),
        ...(input.sortBy === undefined ? [] : [restrictionSortFieldSchema.parse(input.sortBy, accessValidationPath(path, "sortBy"))]),
        ...(input.sortDirection === undefined ? [] : [accessSortDirectionSchema.parse(input.sortDirection, accessValidationPath(path, "sortDirection"))]),
        parseAccessPagination(input, path),
    ];
    for (const result of checks) if (!result.success) issues.push(...result.issues);
    return issues.length > 0 ? accessValidationFailure(issues) : accessValidationSuccess(input as unknown as ListRestrictionsQuery);
});
