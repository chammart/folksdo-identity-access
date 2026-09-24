// services/access/src/api/validation/common-schemas.ts
// -----------------------------------------------------------------------------
// ACCESS COMMON SCHEMAS
// -----------------------------------------------------------------------------
// Reusable transport validation schemas for Access Operations™ API requests.
//
// Boundary:
//   • validates primitive and structural transport concerns
//   • does not validate business eligibility or lifecycle transitions
//   • does not depend on application state, persistence or use cases
// -----------------------------------------------------------------------------

import {
    accessInvalidFormatIssue,
    accessInvalidTypeIssue,
    accessInvalidValueIssue,
    accessNotIntegerIssue,
    accessRequiredIssue,
    accessTooLargeIssue,
    accessTooLongIssue,
    accessTooShortIssue,
    accessTooSmallIssue,
    accessUnknownFieldIssue,
    accessValidationArrayPath,
    accessValidationFailure,
    accessValidationPath,
    accessValidationSuccess,
    createAccessNestedSchema,
    type AccessNestedSchema,
    type AccessValidationIssue,
    type AccessValidationResult,
    type InferAccessNestedSchema,
} from "./access-validation";

// -----------------------------------------------------------------------------
// GENERIC CONSTANTS
// -----------------------------------------------------------------------------

export const accessDefaultIdentifierMaximumLength =
    128;

export const accessDefaultKeyMaximumLength =
    160;

export const accessDefaultNameMaximumLength =
    160;

export const accessDefaultDescriptionMaximumLength =
    2_000;

export const accessDefaultReasonMaximumLength =
    1_000;

export const accessDefaultSearchMaximumLength =
    200;

export const accessDefaultPageLimit =
    50;

export const accessMaximumPageLimit =
    200;

// -----------------------------------------------------------------------------
// OBJECT HELPERS
// -----------------------------------------------------------------------------

export type AccessUnknownObject =
    Readonly<Record<string, unknown>>;

export function isAccessUnknownObject(
    value: unknown,
): value is AccessUnknownObject {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(
            value,
        )
    );
}

export function parseAccessObject(
    value: unknown,
    path: string,
): AccessValidationResult<AccessUnknownObject> {
    if (
        !isAccessUnknownObject(
            value,
        )
    ) {
        return accessValidationFailure([
            accessInvalidTypeIssue(
                path,
                "an object",
            ),
        ]);
    }

    return accessValidationSuccess(
        value,
    );
}

/**
 * Reports unsupported object fields.
 *
 * Strict transport schemas prevent clients from assuming that ignored fields
 * have application meaning.
 */
export function findUnknownAccessObjectFields(
    value: AccessUnknownObject,
    allowedFields: readonly string[],
    path: string,
): readonly AccessValidationIssue[] {
    const allowed =
        new Set(
            allowedFields,
        );

    const issues: AccessValidationIssue[] =
        [];

    for (
        const field
        of Object.keys(
            value,
        )
    ) {
        if (
            !allowed.has(
                field,
            )
        ) {
            issues.push(
                accessUnknownFieldIssue(
                    accessValidationPath(
                        path,
                        field,
                    ),
                ),
            );
        }
    }

    return issues;
}

// -----------------------------------------------------------------------------
// STRING SCHEMAS
// -----------------------------------------------------------------------------

export interface AccessStringSchemaOptions {
    readonly minimumLength?: number;

    readonly maximumLength?: number;

    /**
     * Removes leading and trailing whitespace before applying constraints.
     */
    readonly trim?: boolean;

    /**
     * Rejects blank strings after optional trimming.
     */
    readonly allowEmpty?: boolean;

    readonly pattern?: RegExp;

    readonly formatDescription?: string;
}

export function accessStringSchema(
    options: AccessStringSchemaOptions = {},
): AccessNestedSchema<string> {
    const minimumLength =
        options.minimumLength
        ?? 0;

    const maximumLength =
        options.maximumLength;

    const trim =
        options.trim
        ?? false;

    const allowEmpty =
        options.allowEmpty
        ?? true;

    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<string> => {
            if (
                typeof value !== "string"
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "a string",
                    ),
                ]);
            }

            const normalized =
                trim
                    ? value.trim()
                    : value;

            const issues: AccessValidationIssue[] =
                [];

            if (
                !allowEmpty
                && normalized.length === 0
            ) {
                issues.push(
                    accessRequiredIssue(
                        path,
                    ),
                );
            }

            if (
                normalized.length < minimumLength
            ) {
                issues.push(
                    accessTooShortIssue(
                        path,
                        minimumLength,
                    ),
                );
            }

            if (
                maximumLength !== undefined
                && normalized.length > maximumLength
            ) {
                issues.push(
                    accessTooLongIssue(
                        path,
                        maximumLength,
                    ),
                );
            }

            if (
                options.pattern !== undefined
                && normalized.length > 0
                && !options.pattern.test(
                    normalized,
                )
            ) {
                issues.push(
                    accessInvalidFormatIssue(
                        path,
                        options.formatDescription
                        ?? "in the expected format",
                    ),
                );
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            return accessValidationSuccess(
                normalized,
            );
        },
    );
}

export function accessRequiredStringSchema(
    options: Omit<
        AccessStringSchemaOptions,
        "allowEmpty"
    > = {},
): AccessNestedSchema<string> {
    return accessStringSchema({
        ...options,

        allowEmpty:
            false,

        minimumLength:
            options.minimumLength
            ?? 1,
    });
}

export const accessIdentifierSchema =
    accessRequiredStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultIdentifierMaximumLength,
    });

/**
 * Canonical machine-readable Access key.
 *
 * Examples:
 *   tenant.manage
 *   membership.read
 *   subscription.capability.override
 */
export const accessKeySchema =
    accessRequiredStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultKeyMaximumLength,

        pattern:
            /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/,

        formatDescription:
            "a lowercase machine-readable key",
    });

export const accessNameSchema =
    accessRequiredStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultNameMaximumLength,
    });

export const accessDescriptionSchema =
    accessStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultDescriptionMaximumLength,
    });

export const accessReasonSchema =
    accessStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultReasonMaximumLength,
    });

export const accessSearchSchema =
    accessStringSchema({
        trim:
            true,

        maximumLength:
            accessDefaultSearchMaximumLength,
    });

// -----------------------------------------------------------------------------
// ENUM SCHEMA
// -----------------------------------------------------------------------------

export function accessEnumSchema<
    const TValues extends readonly string[],
>(
    values: TValues,
): AccessNestedSchema<TValues[number]> {
    const allowedValues =
        new Set<string>(
            values,
        );

    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<TValues[number]> => {
            if (
                typeof value !== "string"
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "a string",
                    ),
                ]);
            }

            if (
                !allowedValues.has(
                    value,
                )
            ) {
                return accessValidationFailure([
                    accessInvalidValueIssue(
                        path,
                        values,
                    ),
                ]);
            }

            return accessValidationSuccess(
                value as TValues[number],
            );
        },
    );
}

// -----------------------------------------------------------------------------
// NUMBER SCHEMA
// -----------------------------------------------------------------------------

export interface AccessNumberSchemaOptions {
    readonly integer?: boolean;

    readonly minimum?: number;

    readonly maximum?: number;
}

export function accessNumberSchema(
    options: AccessNumberSchemaOptions = {},
): AccessNestedSchema<number> {
    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<number> => {
            if (
                typeof value !== "number"
                || !Number.isFinite(
                    value,
                )
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "a finite number",
                    ),
                ]);
            }

            const issues: AccessValidationIssue[] =
                [];

            if (
                options.integer === true
                && !Number.isInteger(
                    value,
                )
            ) {
                issues.push(
                    accessNotIntegerIssue(
                        path,
                    ),
                );
            }

            if (
                options.minimum !== undefined
                && value < options.minimum
            ) {
                issues.push(
                    accessTooSmallIssue(
                        path,
                        options.minimum,
                    ),
                );
            }

            if (
                options.maximum !== undefined
                && value > options.maximum
            ) {
                issues.push(
                    accessTooLargeIssue(
                        path,
                        options.maximum,
                    ),
                );
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            return accessValidationSuccess(
                value,
            );
        },
    );
}

export const accessPositiveIntegerSchema =
    accessNumberSchema({
        integer:
            true,

        minimum:
            1,
    });

export const accessNonNegativeIntegerSchema =
    accessNumberSchema({
        integer:
            true,

        minimum:
            0,
    });

export const accessPageLimitSchema =
    accessNumberSchema({
        integer:
            true,

        minimum:
            1,

        maximum:
            accessMaximumPageLimit,
    });

export const accessPageOffsetSchema =
    accessNumberSchema({
        integer:
            true,

        minimum:
            0,
    });

// -----------------------------------------------------------------------------
// BOOLEAN SCHEMA
// -----------------------------------------------------------------------------

export const accessBooleanSchema =
    createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<boolean> => {
            if (
                typeof value !== "boolean"
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "a boolean",
                    ),
                ]);
            }

            return accessValidationSuccess(
                value,
            );
        },
    );

// -----------------------------------------------------------------------------
// ISO DATE-TIME SCHEMA
// -----------------------------------------------------------------------------

export const accessIsoDateTimeSchema =
    createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<string> => {
            if (
                typeof value !== "string"
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "an ISO 8601 date-time string",
                    ),
                ]);
            }

            const normalized =
                value.trim();

            if (
                normalized.length === 0
                || !isStrictIsoDateTime(
                    normalized,
                )
            ) {
                return accessValidationFailure([
                    accessInvalidFormatIssue(
                        path,
                        "a valid ISO 8601 date-time string",
                    ),
                ]);
            }

            return accessValidationSuccess(
                normalized,
            );
        },
    );

function isStrictIsoDateTime(
    value: string,
): boolean {
    const isoPattern =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

    if (
        !isoPattern.test(
            value,
        )
    ) {
        return false;
    }

    return !Number.isNaN(
        Date.parse(
            value,
        ),
    );
}

// -----------------------------------------------------------------------------
// ARRAY SCHEMAS
// -----------------------------------------------------------------------------

export interface AccessArraySchemaOptions {
    readonly minimumLength?: number;

    readonly maximumLength?: number;
}

export function accessArraySchema<
    TSchema extends AccessNestedSchema<unknown>,
>(
    itemSchema: TSchema,
    options: AccessArraySchemaOptions = {},
): AccessNestedSchema<
    readonly InferAccessNestedSchema<TSchema>[]
> {
    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<
            readonly InferAccessNestedSchema<TSchema>[]
        > => {
            if (
                !Array.isArray(
                    value,
                )
            ) {
                return accessValidationFailure([
                    accessInvalidTypeIssue(
                        path,
                        "an array",
                    ),
                ]);
            }

            const issues: AccessValidationIssue[] =
                [];

            if (
                options.minimumLength !== undefined
                && value.length < options.minimumLength
            ) {
                issues.push(
                    accessTooShortIssue(
                        path,
                        options.minimumLength,
                    ),
                );
            }

            if (
                options.maximumLength !== undefined
                && value.length > options.maximumLength
            ) {
                issues.push(
                    accessTooLongIssue(
                        path,
                        options.maximumLength,
                    ),
                );
            }

            const parsedValues:
                InferAccessNestedSchema<TSchema>[] =
                [];

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {
                const result =
                    itemSchema.parse(
                        value[index],
                        accessValidationArrayPath(
                            path,
                            index,
                        ),
                    );

                if (
                    result.success
                ) {
                    parsedValues.push(
                        result.value as InferAccessNestedSchema<TSchema>,
                    );
                } else {
                    issues.push(
                        ...result.issues,
                    );
                }
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            return accessValidationSuccess(
                parsedValues,
            );
        },
    );
}

/**
 * String-array schema that normalizes duplicates while preserving first-seen
 * order.
 */
export function accessUniqueStringArraySchema(
    itemSchema: AccessNestedSchema<string>,
    options: AccessArraySchemaOptions = {},
): AccessNestedSchema<readonly string[]> {
    const arraySchema =
        accessArraySchema(
            itemSchema,
            options,
        );

    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<readonly string[]> => {
            const parsed =
                arraySchema.parse(
                    value,
                    path,
                );

            if (
                !parsed.success
            ) {
                return parsed;
            }

            return accessValidationSuccess([
                ...new Set(
                    parsed.value,
                ),
            ]);
        },
    );
}

// -----------------------------------------------------------------------------
// OPTIONAL AND NULLABLE SCHEMAS
// -----------------------------------------------------------------------------

export function accessOptionalSchema<T>(
    schema: AccessNestedSchema<T>,
): AccessNestedSchema<T | undefined> {
    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<T | undefined> => {
            if (
                value === undefined
            ) {
                return accessValidationSuccess(
                    undefined,
                );
            }

            return schema.parse(
                value,
                path,
            );
        },
    );
}

export function accessNullableSchema<T>(
    schema: AccessNestedSchema<T>,
): AccessNestedSchema<T | null> {
    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<T | null> => {
            if (
                value === null
            ) {
                return accessValidationSuccess(
                    null,
                );
            }

            return schema.parse(
                value,
                path,
            );
        },
    );
}

// -----------------------------------------------------------------------------
// JSON-COMPATIBLE VALUE SCHEMA
// -----------------------------------------------------------------------------

export type AccessJsonPrimitive =
    | string
    | number
    | boolean
    | null;

export type AccessJsonValue =
    | AccessJsonPrimitive
    | readonly AccessJsonValue[]
    | {
        readonly [key: string]:
        AccessJsonValue;
    };

export interface AccessJsonValueSchemaOptions {
    readonly maximumDepth?: number;

    readonly maximumArrayLength?: number;

    readonly maximumObjectKeys?: number;
}

export function accessJsonValueSchema(
    options: AccessJsonValueSchemaOptions = {},
): AccessNestedSchema<AccessJsonValue> {
    const maximumDepth =
        options.maximumDepth
        ?? 8;

    const maximumArrayLength =
        options.maximumArrayLength
        ?? 100;

    const maximumObjectKeys =
        options.maximumObjectKeys
        ?? 100;

    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<AccessJsonValue> =>
            parseAccessJsonValue(
                value,
                path,
                0,
                maximumDepth,
                maximumArrayLength,
                maximumObjectKeys,
            ),
    );
}

function parseAccessJsonValue(
    value: unknown,
    path: string,
    depth: number,
    maximumDepth: number,
    maximumArrayLength: number,
    maximumObjectKeys: number,
): AccessValidationResult<AccessJsonValue> {
    if (
        value === null
        || typeof value === "string"
        || typeof value === "boolean"
    ) {
        return accessValidationSuccess(
            value,
        );
    }

    if (
        typeof value === "number"
    ) {
        if (
            !Number.isFinite(
                value,
            )
        ) {
            return accessValidationFailure([
                accessInvalidTypeIssue(
                    path,
                    "a JSON-compatible value",
                ),
            ]);
        }

        return accessValidationSuccess(
            value,
        );
    }

    if (
        depth >= maximumDepth
    ) {
        return accessValidationFailure([
            accessInvalidFormatIssue(
                path,
                `nested no deeper than ${maximumDepth} levels`,
            ),
        ]);
    }

    if (
        Array.isArray(
            value,
        )
    ) {
        if (
            value.length > maximumArrayLength
        ) {
            return accessValidationFailure([
                accessTooLongIssue(
                    path,
                    maximumArrayLength,
                ),
            ]);
        }

        const issues: AccessValidationIssue[] =
            [];

        const result:
            AccessJsonValue[] =
            [];

        for (
            let index = 0;
            index < value.length;
            index += 1
        ) {
            const parsed =
                parseAccessJsonValue(
                    value[index],
                    accessValidationArrayPath(
                        path,
                        index,
                    ),
                    depth + 1,
                    maximumDepth,
                    maximumArrayLength,
                    maximumObjectKeys,
                );

            if (
                parsed.success
            ) {
                result.push(
                    parsed.value,
                );
            } else {
                issues.push(
                    ...parsed.issues,
                );
            }
        }

        if (
            issues.length > 0
        ) {
            return accessValidationFailure(
                issues,
            );
        }

        return accessValidationSuccess(
            result,
        );
    }

    if (
        isAccessUnknownObject(
            value,
        )
    ) {
        const keys =
            Object.keys(
                value,
            );

        if (
            keys.length > maximumObjectKeys
        ) {
            return accessValidationFailure([
                accessTooLongIssue(
                    path,
                    maximumObjectKeys,
                ),
            ]);
        }

        const issues: AccessValidationIssue[] =
            [];

        const result:
            Record<string, AccessJsonValue> =
            {};

        for (
            const key
            of keys
        ) {
            const parsed =
                parseAccessJsonValue(
                    value[key],
                    accessValidationPath(
                        path,
                        key,
                    ),
                    depth + 1,
                    maximumDepth,
                    maximumArrayLength,
                    maximumObjectKeys,
                );

            if (
                parsed.success
            ) {
                result[key] =
                    parsed.value;
            } else {
                issues.push(
                    ...parsed.issues,
                );
            }
        }

        if (
            issues.length > 0
        ) {
            return accessValidationFailure(
                issues,
            );
        }

        return accessValidationSuccess(
            result,
        );
    }

    return accessValidationFailure([
        accessInvalidTypeIssue(
            path,
            "a JSON-compatible value",
        ),
    ]);
}

// -----------------------------------------------------------------------------
// STRING RECORD SCHEMA
// -----------------------------------------------------------------------------

export function accessJsonRecordSchema(
    options: AccessJsonValueSchemaOptions = {},
): AccessNestedSchema<
    Readonly<Record<string, AccessJsonValue>>
> {
    const valueSchema =
        accessJsonValueSchema(
            options,
        );

    return createAccessNestedSchema(
        (
            value,
            path,
        ): AccessValidationResult<
            Readonly<Record<string, AccessJsonValue>>
        > => {
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

            const result:
                Record<string, AccessJsonValue> =
                {};

            const issues: AccessValidationIssue[] =
                [];

            for (
                const [
                    key,
                    item,
                ]
                of Object.entries(
                    objectResult.value,
                )
            ) {
                const itemResult =
                    valueSchema.parse(
                        item,
                        accessValidationPath(
                            path,
                            key,
                        ),
                    );

                if (
                    itemResult.success
                ) {
                    result[key] =
                        itemResult.value;
                } else {
                    issues.push(
                        ...itemResult.issues,
                    );
                }
            }

            if (
                issues.length > 0
            ) {
                return accessValidationFailure(
                    issues,
                );
            }

            return accessValidationSuccess(
                result,
            );
        },
    );
}

// -----------------------------------------------------------------------------
// SORTING SCHEMAS
// -----------------------------------------------------------------------------

export const accessSortDirectionSchema =
    accessEnumSchema([
        "asc",
        "desc",
    ] as const);

// -----------------------------------------------------------------------------
// PAGINATION PARSING
// -----------------------------------------------------------------------------

export interface AccessPaginationQuery {
    readonly limit?: number;

    readonly offset?: number;
}

/**
 * Parses optional pagination fields from an already-validated query object.
 */
export function parseAccessPagination(
    value: AccessUnknownObject,
    path: string,
): AccessValidationResult<AccessPaginationQuery> {
    const limitResult =
        value.limit === undefined
            ? accessValidationSuccess<number | undefined>(
                undefined,
            )
            : accessPageLimitSchema.parse(
                value.limit,
                accessValidationPath(
                    path,
                    "limit",
                ),
            );

    const offsetResult =
        value.offset === undefined
            ? accessValidationSuccess<number | undefined>(
                undefined,
            )
            : accessPageOffsetSchema.parse(
                value.offset,
                accessValidationPath(
                    path,
                    "offset",
                ),
            );

    if (
        !limitResult.success
        && !offsetResult.success
    ) {
        return accessValidationFailure([
            ...limitResult.issues,
            ...offsetResult.issues,
        ]);
    }

    if (
        !limitResult.success
    ) {
        return accessValidationFailure(
            limitResult.issues,
        );
    }

    if (
        !offsetResult.success
    ) {
        return accessValidationFailure(
            offsetResult.issues,
        );
    }

    return accessValidationSuccess({
        limit:
            limitResult.value,

        offset:
            offsetResult.value,
    });
}