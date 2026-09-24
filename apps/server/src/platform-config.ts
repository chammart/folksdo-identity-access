// apps/server/src/platform-config.ts
// -----------------------------------------------------------------------------
// IAM HOST PLATFORM CONFIG
// -----------------------------------------------------------------------------
// Host-owned technical configuration. Identity business configuration is wired
// separately when Identity bootstrap and security dependencies are integrated.
// -----------------------------------------------------------------------------

import type { PlatformRuntimeConfig } from "@folksdo-platform/runtime";

function requiredEnvironment(
    name: string,
    env: NodeJS.ProcessEnv,
): string {
    const value = env[name]?.trim();

    if (!value) {
        throw new Error(`${name} is required`);
    }

    return value;
}

export function createHostPlatformConfig(
    env: NodeJS.ProcessEnv = process.env,
): PlatformRuntimeConfig {
    const mongodbUri = requiredEnvironment(
        "IAM_MONGODB_URI",
        env,
    );
    const natsUrl = requiredEnvironment(
        "IAM_NATS_URL",
        env,
    );

    return {
        mongodb: {
            uri: mongodbUri,
            databaseName: requiredEnvironment(
                "IAM_MONGODB_DATABASE",
                env,
            ),
        },
        logging: {
            level: readLogLevel(
                env.LOG_LEVEL,
            ),
            serviceName: env.IAM_SERVICE_NAME?.trim()
                || "folksdo-identity-access",
        },
        engine: {
            eventStoreCollectionName: "engine_events",
            outboxCollectionName: "engine_outbox",
            aggregateVersionCollectionName: "engine_aggregate_versions",
            // Engine messaging is activated when Identity event publishing is
            // integrated; no business routes are registered in this patch.
            messaging: { provider: "none" },
            logLevel: readLogLevel(
                env.LOG_LEVEL,
            ),
        },
        processing: {
            enabled: true,
            outboxCollectionName: "engine_outbox",
            outboxBatchSize: readPositiveInteger(
                "IAM_PROCESSING_OUTBOX_BATCH_SIZE",
                env,
            ),
            outboxPollingIntervalMilliseconds: readPositiveInteger(
                "IAM_PROCESSING_OUTBOX_POLLING_INTERVAL_MILLISECONDS",
                env,
            ),
            outboxMaxAttempts: readPositiveInteger(
                "IAM_PROCESSING_OUTBOX_MAX_ATTEMPTS",
                env,
            ),
            reactionMaxAttempts: readPositiveInteger(
                "IAM_PROCESSING_REACTION_MAX_ATTEMPTS",
                env,
            ),
            reactionInitialBackoffMilliseconds: readPositiveInteger(
                "IAM_PROCESSING_REACTION_INITIAL_BACKOFF_MILLISECONDS",
                env,
            ),
            reactionDeadLetterSubject: requiredEnvironment(
                "IAM_PROCESSING_REACTION_DEAD_LETTER_SUBJECT",
                env,
            ),
            messaging: {
                provider: "nats",
                connectionUri: natsUrl,
                subjectPrefix: requiredEnvironment(
                    "IAM_NATS_SUBJECT_PREFIX",
                    env,
                ),
            },
            logLevel: readLogLevel(
                env.LOG_LEVEL,
            ),
        },
    };
}

function readPositiveInteger(
    name: string,
    env: NodeJS.ProcessEnv,
): number {
    const value =
        Number(
            requiredEnvironment(
                name,
                env,
            ),
        );

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(
            `${name} must be a positive integer`,
        );
    }

    return value;
}

function readLogLevel(
    value: string | undefined,
): "debug" | "info" | "warn" | "error" | "silent" {
    const level =
        value?.trim();

    switch (level) {
        case "debug":
        case "info":
        case "warn":
        case "error":
        case "silent":
            return level;
        default:
            throw new Error(
                "LOG_LEVEL must be debug, info, warn, error, or silent",
            );
    }
}
