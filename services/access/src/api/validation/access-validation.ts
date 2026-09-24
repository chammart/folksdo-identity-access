// services/access/src/api/validation/access-validation.ts
// -----------------------------------------------------------------------------
// ACCESS API VALIDATION
// -----------------------------------------------------------------------------
// Transport-neutral validation primitives used by Access Operations™ API
// request and query schemas.
//
// Purpose:
//   • validate untrusted transport values
//   • return stable, structured validation issues
//   • keep HTTP and framework concerns outside schema definitions
//   • preserve inferred request DTO types after successful parsing
//
// Boundary:
//   • validates transport shape only
//   • does not execute Access business rules
//   • does not query canonical state or read stores
//   • does not invoke use cases
//   • does not depend on Fastify, MongoDB, Folksdo Engine or adapters
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// VALIDATION ISSUE
// -----------------------------------------------------------------------------

export type AccessValidationIssueCode =
    | "required"
    | "invalid_type"
    | "invalid_value"
    | "invalid_format"
    | "too_short"
    | "too_long"
    | "too_small"
    | "too_large"
    | "not_integer"
    | "unknown_field";

export interface AccessValidationIssue {
    /**
     * Dot-delimited path identifying the invalid transport value.
     *
     * Examples:
     *   roleId
     *   resource.type
     *   conditions[0].operator
     */
    readonly path: string;

    readonly code: AccessValidationIssueCode;

    readonly message: string;
}

// -----------------------------------------------------------------------------
// VALIDATION RESULTS
// -----------------------------------------------------------------------------

export interface AccessValidationSuccess<T> {
    readonly success: true;

    readonly value: T;
}

export interface AccessValidationFailure {
    readonly success: false;

    readonly issues: readonly AccessValidationIssue[];
}

export type AccessValidationResult<T> =
    | AccessValidationSuccess<T>
    | AccessValidationFailure;

export function accessValidationSuccess<T>(
    value: T,
): AccessValidationSuccess<T> {
    return {
        success: true,
        value,
    };
}

export function accessValidationFailure(
    issues: readonly AccessValidationIssue[],
): AccessValidationFailure {
    return {
        success: false,
        issues,
    };
}

// -----------------------------------------------------------------------------
// SCHEMA CONTRACT
// -----------------------------------------------------------------------------

/**
 * Transport-neutral schema contract.
 *
 * Implementations must never throw for ordinary invalid input. They should
 * return a structured AccessValidationFailure instead.
 */
export interface AccessRequestSchema<T> {
    parse(
        value: unknown,
    ): AccessValidationResult<T>;
}

/**
 * Infers the successful output type from an Access request schema.
 */
export type InferAccessSchema<
    TSchema extends AccessRequestSchema<unknown>,
> =
    TSchema extends AccessRequestSchema<infer TValue>
    ? TValue
    : never;

// -----------------------------------------------------------------------------
// SCHEMA FACTORY
// -----------------------------------------------------------------------------

export type AccessSchemaParser<T> = (
    value: unknown,
    path: string,
) => AccessValidationResult<T>;

export function createAccessRequestSchema<T>(
    parser: AccessSchemaParser<T>,
): AccessRequestSchema<T> {
    return {
        parse(
            value: unknown,
        ): AccessValidationResult<T> {
            return parser(
                value,
                "",
            );
        },
    };
}

/**
 * Creates a nested schema parser that can participate in larger object and
 * collection schemas while preserving the caller-provided path.
 */
export function createAccessNestedSchema<T>(
    parser: AccessSchemaParser<T>,
): AccessNestedSchema<T> {
    return {
        parse(
            value: unknown,
            path: string,
        ): AccessValidationResult<T> {
            return parser(
                value,
                path,
            );
        },
    };
}

export interface AccessNestedSchema<T> {
    parse(
        value: unknown,
        path: string,
    ): AccessValidationResult<T>;
}

export type InferAccessNestedSchema<
    TSchema extends AccessNestedSchema<unknown>,
> =
    TSchema extends AccessNestedSchema<infer TValue>
    ? TValue
    : never;

// -----------------------------------------------------------------------------
// PATH HELPERS
// -----------------------------------------------------------------------------

export function accessValidationPath(
    parent: string,
    field: string,
): string {
    if (
        parent.length === 0
    ) {
        return field;
    }

    return `${parent}.${field}`;
}

export function accessValidationArrayPath(
    parent: string,
    index: number,
): string {
    return `${parent}[${index}]`;
}

export function accessValidationDisplayPath(
    path: string,
): string {
    return path.length > 0
        ? path
        : "request";
}

// -----------------------------------------------------------------------------
// ISSUE FACTORIES
// -----------------------------------------------------------------------------

export function accessRequiredIssue(
    path: string,
): AccessValidationIssue {
    return {
        path,

        code:
            "required",

        message:
            `${accessValidationDisplayPath(path)} is required.`,
    };
}

export function accessInvalidTypeIssue(
    path: string,
    expectedType: string,
): AccessValidationIssue {
    return {
        path,

        code:
            "invalid_type",

        message:
            `${accessValidationDisplayPath(path)} must be ${expectedType}.`,
    };
}

export function accessInvalidValueIssue(
    path: string,
    expectedValues?: readonly string[],
): AccessValidationIssue {
    if (
        expectedValues === undefined
        || expectedValues.length === 0
    ) {
        return {
            path,

            code:
                "invalid_value",

            message:
                `${accessValidationDisplayPath(path)} contains an invalid value.`,
        };
    }

    return {
        path,

        code:
            "invalid_value",

        message:
            `${accessValidationDisplayPath(path)} must be one of: ${expectedValues.join(", ")}.`,
    };
}

export function accessInvalidFormatIssue(
    path: string,
    expectedFormat: string,
): AccessValidationIssue {
    return {
        path,

        code:
            "invalid_format",

        message:
            `${accessValidationDisplayPath(path)} must be ${expectedFormat}.`,
    };
}

export function accessTooShortIssue(
    path: string,
    minimumLength: number,
): AccessValidationIssue {
    return {
        path,

        code:
            "too_short",

        message:
            `${accessValidationDisplayPath(path)} must contain at least ${minimumLength} characters.`,
    };
}

export function accessTooLongIssue(
    path: string,
    maximumLength: number,
): AccessValidationIssue {
    return {
        path,

        code:
            "too_long",

        message:
            `${accessValidationDisplayPath(path)} must contain at most ${maximumLength} characters.`,
    };
}

export function accessTooSmallIssue(
    path: string,
    minimum: number,
): AccessValidationIssue {
    return {
        path,

        code:
            "too_small",

        message:
            `${accessValidationDisplayPath(path)} must be greater than or equal to ${minimum}.`,
    };
}

export function accessTooLargeIssue(
    path: string,
    maximum: number,
): AccessValidationIssue {
    return {
        path,

        code:
            "too_large",

        message:
            `${accessValidationDisplayPath(path)} must be less than or equal to ${maximum}.`,
    };
}

export function accessNotIntegerIssue(
    path: string,
): AccessValidationIssue {
    return {
        path,

        code:
            "not_integer",

        message:
            `${accessValidationDisplayPath(path)} must be an integer.`,
    };
}

export function accessUnknownFieldIssue(
    path: string,
): AccessValidationIssue {
    return {
        path,

        code:
            "unknown_field",

        message:
            `${accessValidationDisplayPath(path)} is not supported.`,
    };
}

// -----------------------------------------------------------------------------
// RESULT HELPERS
// -----------------------------------------------------------------------------

export function accessValidationIsSuccess<T>(
    result: AccessValidationResult<T>,
): result is AccessValidationSuccess<T> {
    return result.success;
}

export function accessValidationIsFailure<T>(
    result: AccessValidationResult<T>,
): result is AccessValidationFailure {
    return !result.success;
}

/**
 * Combines validation issues from multiple results.
 */
export function collectAccessValidationIssues(
    results:
        readonly AccessValidationResult<unknown>[],
): readonly AccessValidationIssue[] {
    const issues: AccessValidationIssue[] =
        [];

    for (
        const result
        of results
    ) {
        if (
            !result.success
        ) {
            issues.push(
                ...result.issues,
            );
        }
    }

    return issues;
}

/**
 * Converts an optional nested parse result into an undefined value when the
 * input was omitted.
 */
export function parseOptionalAccessValue<T>(
    value: unknown,
    path: string,
    schema: AccessNestedSchema<T>,
): AccessValidationResult<T | undefined> {
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
}