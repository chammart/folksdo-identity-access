// services/access/src/runtime/access-runtime-config.ts
// -----------------------------------------------------------------------------
// ACCESS RUNTIME CONFIG
// -----------------------------------------------------------------------------
// Canonical configuration for the Access Operations™ runtime.
//
// Purpose:
//   • define service enablement and worker scheduling configuration
//   • define readiness behavior owned by the Access runtime
//   • centralize defaults and validation
//
// Boundary:
//   • contains configuration only
//   • does not read environment variables directly
//   • does not construct infrastructure or business dependencies
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// WORKER CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessRuntimeWorkerConfig {
    readonly enabled:
    boolean;

    readonly name:
    string;

    readonly intervalMs:
    number;

    readonly runOnStart:
    boolean;

    readonly unref:
    boolean;
}

export interface AccessRuntimeWorkersConfig {
    readonly assignmentExpiration:
    AccessRuntimeWorkerConfig;

    readonly restrictionExpiration:
    AccessRuntimeWorkerConfig;
}

// -----------------------------------------------------------------------------
// READINESS CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessRuntimeReadinessConfig {
    readonly probeTimeoutMs:
    number;
}

// -----------------------------------------------------------------------------
// RUNTIME CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessRuntimeConfig {
    readonly enabled:
    boolean;

    readonly workers:
    AccessRuntimeWorkersConfig;

    readonly readiness:
    AccessRuntimeReadinessConfig;
}

export interface AccessRuntimeConfigInput {
    readonly enabled?:
    boolean;

    readonly workers?: {
        readonly assignmentExpiration?:
        Partial<AccessRuntimeWorkerConfig>;

        readonly restrictionExpiration?:
        Partial<AccessRuntimeWorkerConfig>;
    };

    readonly readiness?:
    Partial<AccessRuntimeReadinessConfig>;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_ACCESS_RUNTIME_CONFIG:
AccessRuntimeConfig = {
    enabled:
        true,

    workers: {
        assignmentExpiration: {
            enabled:
                true,

            name:
                "access-expire-assignments",

            intervalMs:
                60_000,

            runOnStart:
                true,

            unref:
                true,
        },

        restrictionExpiration: {
            enabled:
                true,

            name:
                "access-expire-restrictions",

            intervalMs:
                60_000,

            runOnStart:
                true,

            unref:
                true,
        },
    },

    readiness: {
        probeTimeoutMs:
            5_000,
    },
};

// -----------------------------------------------------------------------------
// RESOLUTION
// -----------------------------------------------------------------------------

export function resolveAccessRuntimeConfig(
    input:
    AccessRuntimeConfigInput = {},
): AccessRuntimeConfig {
    const config:
    AccessRuntimeConfig = {
        enabled:
            input.enabled
            ?? DEFAULT_ACCESS_RUNTIME_CONFIG.enabled,

        workers: {
            assignmentExpiration: {
                ...DEFAULT_ACCESS_RUNTIME_CONFIG
                    .workers
                    .assignmentExpiration,

                ...input.workers
                    ?.assignmentExpiration,
            },

            restrictionExpiration: {
                ...DEFAULT_ACCESS_RUNTIME_CONFIG
                    .workers
                    .restrictionExpiration,

                ...input.workers
                    ?.restrictionExpiration,
            },
        },

        readiness: {
            ...DEFAULT_ACCESS_RUNTIME_CONFIG
                .readiness,

            ...input.readiness,
        },
    };

    validateAccessRuntimeConfig(
        config,
    );

    return config;
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

export function validateAccessRuntimeConfig(
    config:
    AccessRuntimeConfig,
): void {
    validateWorkerConfig(
        config.workers.assignmentExpiration,
        "Access assignment expiration worker",
    );

    validateWorkerConfig(
        config.workers.restrictionExpiration,
        "Access restriction expiration worker",
    );

    if (
        !Number.isSafeInteger(
            config.readiness.probeTimeoutMs,
        )
        || config.readiness.probeTimeoutMs <= 0
    ) {
        throw new RangeError(
            "Access readiness probe timeout must be a positive integer.",
        );
    }
}

function validateWorkerConfig(
    config:
    AccessRuntimeWorkerConfig,
    label:
    string,
): void {
    if (
        config.name.trim().length === 0
    ) {
        throw new Error(
            `${label} name must be a non-empty string.`,
        );
    }

    if (
        !Number.isSafeInteger(
            config.intervalMs,
        )
        || config.intervalMs <= 0
    ) {
        throw new RangeError(
            `${label} interval must be a positive integer.`,
        );
    }
}
