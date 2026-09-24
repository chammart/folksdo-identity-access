// services/access/src/api/validation/authorization-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHORIZATION SCHEMAS
// -----------------------------------------------------------------------------
// Transport validation for authorization decision requests.
// -----------------------------------------------------------------------------

import type {
    AuthorizeRequest,
    AuthorizeResourceRequest,
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
    accessIdentifierSchema,
    accessKeySchema,
    findUnknownAccessObjectFields,
    parseAccessObject,
} from "./common-schemas";

export const authorizeRequestSchema =
    createAccessRequestSchema<AuthorizeRequest>(
        (value, path): AccessValidationResult<AuthorizeRequest> => {
            const objectResult = parseAccessObject(value, path);
            if (!objectResult.success) return objectResult;

            const input = objectResult.value;
            const issues: AccessValidationIssue[] = [
                ...findUnknownAccessObjectFields(
                    input,
                    ["action", "resource", "membershipId", "tenantId", "attributes"],
                    path,
                ),
            ];

            const actionResult = accessKeySchema.parse(
                input.action,
                accessValidationPath(path, "action"),
            );

            const resourceResult = parseAuthorizeResource(
                input.resource,
                accessValidationPath(path, "resource"),
            );

            const membershipIdResult = input.membershipId === undefined
                ? accessValidationSuccess<string | undefined>(undefined)
                : accessIdentifierSchema.parse(
                    input.membershipId,
                    accessValidationPath(path, "membershipId"),
                );

            const tenantIdResult = input.tenantId === undefined
                ? accessValidationSuccess<string | undefined>(undefined)
                : accessIdentifierSchema.parse(
                    input.tenantId,
                    accessValidationPath(path, "tenantId"),
                );

            const attributesResult = input.attributes === undefined
                ? accessValidationSuccess<Readonly<Record<string, unknown>> | undefined>(undefined)
                : parseAccessObject(
                    input.attributes,
                    accessValidationPath(path, "attributes"),
                );

            for (const result of [actionResult, resourceResult, membershipIdResult, tenantIdResult, attributesResult]) {
                if (!result.success) issues.push(...result.issues);
            }

            if (issues.length > 0
                || !actionResult.success
                || !resourceResult.success
                || !membershipIdResult.success
                || !tenantIdResult.success
                || !attributesResult.success) {
                return accessValidationFailure(issues);
            }

            return accessValidationSuccess({
                action: actionResult.value,
                resource: resourceResult.value,
                membershipId: membershipIdResult.value,
                tenantId: tenantIdResult.value,
                attributes: attributesResult.value,
            });
        },
    );

function parseAuthorizeResource(
    value: unknown,
    path: string,
): AccessValidationResult<AuthorizeResourceRequest> {
    const objectResult = parseAccessObject(value, path);
    if (!objectResult.success) return objectResult;

    const input = objectResult.value;
    const issues: AccessValidationIssue[] = [
        ...findUnknownAccessObjectFields(
            input,
            ["type", "id", "attributes"],
            path,
        ),
    ];

    const typeResult = accessKeySchema.parse(
        input.type,
        accessValidationPath(path, "type"),
    );

    const idResult = input.id === undefined
        ? accessValidationSuccess<string | undefined>(undefined)
        : accessIdentifierSchema.parse(
            input.id,
            accessValidationPath(path, "id"),
        );

    const attributesResult = input.attributes === undefined
        ? accessValidationSuccess<Readonly<Record<string, unknown>> | undefined>(undefined)
        : parseAccessObject(
            input.attributes,
            accessValidationPath(path, "attributes"),
        );

    for (const result of [typeResult, idResult, attributesResult]) {
        if (!result.success) issues.push(...result.issues);
    }

    if (issues.length > 0
        || !typeResult.success
        || !idResult.success
        || !attributesResult.success) {
        return accessValidationFailure(issues);
    }

    return accessValidationSuccess({
        type: typeResult.value,
        id: idResult.value,
        attributes: attributesResult.value,
    });
}
