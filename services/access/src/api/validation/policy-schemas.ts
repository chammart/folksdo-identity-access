// services/access/src/api/validation/policy-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS POLICY SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation schemas for authorization Policy API operations.
// -----------------------------------------------------------------------------

import type {
    ApiArchivePolicyRequest,
    ApiCreatePolicyRequest,
    ApiUpdatePolicyRequest,
    ListPoliciesQuery,
} from "../dto";

import {
    accessValidationFailure,
    accessValidationPath,
    accessValidationSuccess,
    createAccessRequestSchema,
    type AccessValidationIssue,
    type AccessValidationResult,
} from "./access-validation";

import {
    accessDescriptionSchema,
    accessEnumSchema,
    accessIdentifierSchema,
    accessKeySchema,
    accessNameSchema,
    accessNonNegativeIntegerSchema,
    accessReasonSchema,
    accessSearchSchema,
    accessSortDirectionSchema,
    accessStringSchema,
    accessUniqueStringArraySchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
    parseAccessPagination,
} from "./common-schemas";

const policyScopeSchema = accessEnumSchema(["platform", "tenant"] as const);
const policyEffectSchema = accessEnumSchema(["allow", "deny"] as const);
const policyStatusSchema = accessEnumSchema(["active", "archived"] as const);
const policyOperatorSchema = accessEnumSchema([
    "equals", "not_equals", "in", "not_in", "exists", "not_exists",
] as const);
const policySortFieldSchema = accessEnumSchema([
    "priority", "name", "createdAt", "updatedAt",
] as const);
const policyStringArraySchema = accessUniqueStringArraySchema(
    accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }),
    { maximumLength: 500 },
);

function parseConditions(
    value: unknown,
    path: string,
): AccessValidationResult<ApiCreatePolicyRequest["conditions"]> {
    if (!Array.isArray(value)) {
        return accessValidationFailure([{ path, code: "invalid_type", message: `${path} must be an array.` }]);
    }

    const issues: AccessValidationIssue[] = [];
    const conditions: Array<{ field: string; operator: ApiCreatePolicyRequest["conditions"][number]["operator"]; value?: unknown }> = [];

    value.forEach((candidate, index) => {
        const itemPath = `${path}[${index}]`;
        const objectResult = parseAccessObject(candidate, itemPath);
        if (!objectResult.success) {
            issues.push(...objectResult.issues);
            return;
        }
        const input = objectResult.value;
        issues.push(...findUnknownAccessObjectFields(input, ["field", "operator", "value"], itemPath));
        const fieldResult = accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 240 }).parse(input.field, accessValidationPath(itemPath, "field"));
        const operatorResult = policyOperatorSchema.parse(input.operator, accessValidationPath(itemPath, "operator"));
        if (!fieldResult.success) issues.push(...fieldResult.issues);
        if (!operatorResult.success) issues.push(...operatorResult.issues);
        if (fieldResult.success && operatorResult.success) {
            conditions.push({
                field: fieldResult.value,
                operator: operatorResult.value,
                ...(input.value === undefined ? {} : { value: input.value }),
            });
        }
    });

    return issues.length > 0
        ? accessValidationFailure(issues)
        : accessValidationSuccess(conditions);
}

export const createPolicyRequestSchema = createAccessRequestSchema<ApiCreatePolicyRequest>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [
        ...findUnknownAccessObjectFields(input, ["key", "name", "description", "scope", "tenantId", "permissionKeys", "resourceTypes", "effect", "priority", "conditions"], path),
    ];
    const key = accessKeySchema.parse(input.key, accessValidationPath(path, "key"));
    const name = accessNameSchema.parse(input.name, accessValidationPath(path, "name"));
    const description = input.description === undefined ? accessValidationSuccess(undefined) : accessDescriptionSchema.parse(input.description, accessValidationPath(path, "description"));
    const scope = policyScopeSchema.parse(input.scope, accessValidationPath(path, "scope"));
    const tenantId = input.tenantId === undefined ? accessValidationSuccess(undefined) : accessIdentifierSchema.parse(input.tenantId, accessValidationPath(path, "tenantId"));
    const permissionKeys = policyStringArraySchema.parse(input.permissionKeys, accessValidationPath(path, "permissionKeys"));
    const resourceTypes = input.resourceTypes === undefined ? accessValidationSuccess(undefined) : policyStringArraySchema.parse(input.resourceTypes, accessValidationPath(path, "resourceTypes"));
    const effect = policyEffectSchema.parse(input.effect, accessValidationPath(path, "effect"));
    const priority = accessNonNegativeIntegerSchema.parse(input.priority, accessValidationPath(path, "priority"));
    const conditions = parseConditions(input.conditions, accessValidationPath(path, "conditions"));
    for (const result of [key, name, description, scope, tenantId, permissionKeys, resourceTypes, effect, priority, conditions]) if (!result.success) issues.push(...result.issues);
    if (issues.length > 0) return accessValidationFailure(issues);
    return accessValidationSuccess(input as unknown as ApiCreatePolicyRequest);
});

export const updatePolicyRequestSchema = createAccessRequestSchema<ApiUpdatePolicyRequest>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["policyId", "name", "description", "permissionKeys", "resourceTypes", "effect", "priority", "conditions"], path)];
    const checks = [
        accessIdentifierSchema.parse(input.policyId, accessValidationPath(path, "policyId")),
        ...(input.name === undefined ? [] : [accessNameSchema.parse(input.name, accessValidationPath(path, "name"))]),
        ...(input.description === undefined ? [] : [accessDescriptionSchema.parse(input.description, accessValidationPath(path, "description"))]),
        ...(input.permissionKeys === undefined ? [] : [policyStringArraySchema.parse(input.permissionKeys, accessValidationPath(path, "permissionKeys"))]),
        ...(input.resourceTypes === undefined ? [] : [policyStringArraySchema.parse(input.resourceTypes, accessValidationPath(path, "resourceTypes"))]),
        ...(input.effect === undefined ? [] : [policyEffectSchema.parse(input.effect, accessValidationPath(path, "effect"))]),
        ...(input.priority === undefined ? [] : [accessNonNegativeIntegerSchema.parse(input.priority, accessValidationPath(path, "priority"))]),
        ...(input.conditions === undefined ? [] : [parseConditions(input.conditions, accessValidationPath(path, "conditions"))]),
    ];
    for (const result of checks) if (!result.success) issues.push(...result.issues);
    if (issues.length > 0) return accessValidationFailure(issues);
    return accessValidationSuccess(input as unknown as ApiUpdatePolicyRequest);
});

export const archivePolicyRequestSchema = createAccessRequestSchema<ApiArchivePolicyRequest>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["policyId", "reason"], path)];
    const policyId = accessIdentifierSchema.parse(input.policyId, accessValidationPath(path, "policyId"));
    const reason = input.reason === undefined ? accessValidationSuccess(undefined) : accessReasonSchema.parse(input.reason, accessValidationPath(path, "reason"));
    if (!policyId.success) issues.push(...policyId.issues);
    if (!reason.success) issues.push(...reason.issues);
    return issues.length > 0 ? accessValidationFailure(issues) : accessValidationSuccess(input as unknown as ApiArchivePolicyRequest);
});

export const listPoliciesQuerySchema = createAccessRequestSchema<ListPoliciesQuery>((value, path) => {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;
    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [...findUnknownAccessObjectFields(input, ["tenantId", "scope", "effect", "status", "search", "permissionKey", "resourceType", "limit", "offset", "sortBy", "sortDirection"], path)];
    const checks = [
        ...(input.tenantId === undefined ? [] : [accessIdentifierSchema.parse(input.tenantId, accessValidationPath(path, "tenantId"))]),
        ...(input.scope === undefined ? [] : [policyScopeSchema.parse(input.scope, accessValidationPath(path, "scope"))]),
        ...(input.effect === undefined ? [] : [policyEffectSchema.parse(input.effect, accessValidationPath(path, "effect"))]),
        ...(input.status === undefined ? [] : [policyStatusSchema.parse(input.status, accessValidationPath(path, "status"))]),
        ...(input.search === undefined ? [] : [accessSearchSchema.parse(input.search, accessValidationPath(path, "search"))]),
        ...(input.permissionKey === undefined ? [] : [accessKeySchema.parse(input.permissionKey, accessValidationPath(path, "permissionKey"))]),
        ...(input.resourceType === undefined ? [] : [accessStringSchema({ trim: true, allowEmpty: false, maximumLength: 160 }).parse(input.resourceType, accessValidationPath(path, "resourceType"))]),
        ...(input.sortBy === undefined ? [] : [policySortFieldSchema.parse(input.sortBy, accessValidationPath(path, "sortBy"))]),
        ...(input.sortDirection === undefined ? [] : [accessSortDirectionSchema.parse(input.sortDirection, accessValidationPath(path, "sortDirection"))]),
        parseAccessPagination(input, path),
    ];
    for (const result of checks) if (!result.success) issues.push(...result.issues);
    return issues.length > 0 ? accessValidationFailure(issues) : accessValidationSuccess(input as unknown as ListPoliciesQuery);
});
