// services/access/src/runtime/infrastructure/create-access-observability.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS RUNTIME OBSERVABILITY
// -----------------------------------------------------------------------------
// Runtime observability composition for Access Operations™.
//
// Purpose:
//   • receive the platform observability implementation
//   • preserve Access-owned runtime observability contracts
//   • provide a safe no-operation implementation when observability is optional
//   • prevent provider-specific SDK types from leaking into composition
//
// Boundary:
//   • does not initialize platform telemetry exporters
//   • does not open network connections
//   • does not own logger or metrics-provider shutdown
//   • contains no business behavior
//
// Ownership:
//   Platform infrastructure owns the underlying logger, meter and tracer.
//   Access only receives scoped functions used by its own runtime components.
//
// Naming:
//   The runtime factory is named createAccessRuntimeObservability to avoid a
//   public barrel collision with the service-level createAccessObservability
//   factory exported by services/access/src/observability.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// OBSERVABILITY VALUE TYPES
// -----------------------------------------------------------------------------

export type AccessRuntimeObservabilityAttribute =
    | string
    | number
    | boolean
    | undefined;

export type AccessRuntimeObservabilityAttributes =
    Readonly<
        Record<
            string,
            AccessRuntimeObservabilityAttribute
        >
    >;

// -----------------------------------------------------------------------------
// LOGGER CONTRACT
// -----------------------------------------------------------------------------

export interface AccessRuntimeLogger {
    debug(
        message: string,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;

    info(
        message: string,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;

    warn(
        message: string,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;

    error(
        message: string,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;
}

// -----------------------------------------------------------------------------
// METRICS CONTRACT
// -----------------------------------------------------------------------------

export interface AccessRuntimeMetrics {
    increment(
        name: string,
        value?: number,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;

    record(
        name: string,
        value: number,
        attributes?: AccessRuntimeObservabilityAttributes,
    ): void;
}

// -----------------------------------------------------------------------------
// OBSERVABILITY CONTRACT
// -----------------------------------------------------------------------------

export interface AccessRuntimeObservability {
    readonly logger:
    AccessRuntimeLogger;

    readonly metrics:
    AccessRuntimeMetrics;
}

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessRuntimeObservabilityInput {
    readonly logger?:
    AccessRuntimeLogger;

    readonly metrics?:
    AccessRuntimeMetrics;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessRuntimeObservability(
    input:
        CreateAccessRuntimeObservabilityInput = {},
): AccessRuntimeObservability {
    const observability:
        AccessRuntimeObservability = {
        logger:
            input.logger
            ?? createNoopAccessRuntimeLogger(),

        metrics:
            input.metrics
            ?? createNoopAccessRuntimeMetrics(),
    };

    assertAccessRuntimeObservability(
        observability,
    );

    return observability;
}

// -----------------------------------------------------------------------------
// NO-OP LOGGER
// -----------------------------------------------------------------------------

export function createNoopAccessRuntimeLogger():
    AccessRuntimeLogger {
    return {
        debug:
            () =>
                undefined,

        info:
            () =>
                undefined,

        warn:
            () =>
                undefined,

        error:
            () =>
                undefined,
    };
}

// -----------------------------------------------------------------------------
// NO-OP METRICS
// -----------------------------------------------------------------------------

export function createNoopAccessRuntimeMetrics():
    AccessRuntimeMetrics {
    return {
        increment:
            () =>
                undefined,

        record:
            () =>
                undefined,
    };
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

export function assertAccessRuntimeObservability(
    value: unknown,
): asserts value is AccessRuntimeObservability {
    if (
        typeof value !== "object"
        || value === null
    ) {
        throw new TypeError(
            "Access runtime observability must be an object.",
        );
    }

    const candidate =
        value as Partial<AccessRuntimeObservability>;

    assertAccessRuntimeLogger(
        candidate.logger,
    );

    assertAccessRuntimeMetrics(
        candidate.metrics,
    );
}

export function isAccessRuntimeObservability(
    value: unknown,
): value is AccessRuntimeObservability {
    try {
        assertAccessRuntimeObservability(
            value,
        );

        return true;
    } catch {
        return false;
    }
}

// -----------------------------------------------------------------------------
// LOGGER VALIDATION
// -----------------------------------------------------------------------------

export function assertAccessRuntimeLogger(
    value: unknown,
): asserts value is AccessRuntimeLogger {
    if (
        typeof value !== "object"
        || value === null
    ) {
        throw new TypeError(
            "Access runtime observability requires a logger.",
        );
    }

    const logger =
        value as Partial<AccessRuntimeLogger>;

    if (
        typeof logger.debug !== "function"
        || typeof logger.info !== "function"
        || typeof logger.warn !== "function"
        || typeof logger.error !== "function"
    ) {
        throw new TypeError(
            "Access runtime logger does not implement the required functions.",
        );
    }
}

export function isAccessRuntimeLogger(
    value: unknown,
): value is AccessRuntimeLogger {
    try {
        assertAccessRuntimeLogger(
            value,
        );

        return true;
    } catch {
        return false;
    }
}

// -----------------------------------------------------------------------------
// METRICS VALIDATION
// -----------------------------------------------------------------------------

export function assertAccessRuntimeMetrics(
    value: unknown,
): asserts value is AccessRuntimeMetrics {
    if (
        typeof value !== "object"
        || value === null
    ) {
        throw new TypeError(
            "Access runtime observability requires a metrics provider.",
        );
    }

    const metrics =
        value as Partial<AccessRuntimeMetrics>;

    if (
        typeof metrics.increment !== "function"
        || typeof metrics.record !== "function"
    ) {
        throw new TypeError(
            "Access runtime metrics provider does not implement the required functions.",
        );
    }
}

export function isAccessRuntimeMetrics(
    value: unknown,
): value is AccessRuntimeMetrics {
    try {
        assertAccessRuntimeMetrics(
            value,
        );

        return true;
    } catch {
        return false;
    }
}