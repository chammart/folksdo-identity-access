// tests/integration/support/iam-integration-runtime.ts
// -----------------------------------------------------------------------------
// IAM PRODUCTION-GRADE INTEGRATION RUNTIME
// -----------------------------------------------------------------------------
// Real Platform Runtime + real IAM services for synchronous use-case
// certification. Processing and background workers are certified separately.
// -----------------------------------------------------------------------------

import {
    bootstrapServer,
    type ServerRuntime,
} from "../../../apps/server/src/bootstrap/bootstrap-server";

import {
    MongoClient,
} from "mongodb";

import {
    loadServerConfig,
} from "../../../apps/server/src/config/server-config";

import {
    createIamIntegrationDatabase,
    type IamIntegrationDatabase,
} from "./iam-integration-database";

export interface IamIntegrationRuntime {
    readonly server: ServerRuntime;
    readonly database: IamIntegrationDatabase;
    clean(): Promise<void>;
    close(): Promise<void>;
}

let sharedRuntime:
    Promise<IamIntegrationRuntime> | undefined;

export async function getIamIntegrationRuntime(): Promise<IamIntegrationRuntime> {
    sharedRuntime ??=
        createIamIntegrationRuntime();

    return await sharedRuntime;
}

export async function closeIamIntegrationRuntime(): Promise<void> {
    const runtime =
        sharedRuntime === undefined
            ? undefined
            : await sharedRuntime;

    sharedRuntime =
        undefined;

    await runtime?.close();
}

export async function restartIamIntegrationRuntime(): Promise<IamIntegrationRuntime> {
    const runtime =
        sharedRuntime === undefined
            ? undefined
            : await sharedRuntime;

    sharedRuntime =
        undefined;

    await runtime?.close();

    sharedRuntime =
        createIamIntegrationRuntime({
            cleanBeforeStart:
                false,
        });

    return await sharedRuntime;
}

async function createIamIntegrationRuntime(
    options: {
        readonly cleanBeforeStart?: boolean;
    } = {},
): Promise<IamIntegrationRuntime> {
    assertIntegrationEnvironment();

    const hostConfig =
        loadServerConfig(
            process.env,
        );

    const reactionCertification =
        process.env.IAM_REACTION_CERTIFICATION === "true"
        || process.env.IAM_E2E_CERTIFICATION === "true";

    const config = reactionCertification
        ? hostConfig
        : {
            ...hostConfig,
            platformRuntime: {
                ...hostConfig.platformRuntime,
                processing: {
                    ...hostConfig.platformRuntime.processing,
                    enabled:
                        false,
                    messaging: {
                        provider:
                            "none" as const,
                    },
                },
            },
        };

    if (
        options.cleanBeforeStart
        !== false
    ) {
        await cleanBeforeRuntimeStart(
            config,
        );
    }

    const server =
        await bootstrapServer(config);

    if (reactionCertification) {
        await server.platformRuntime.start();
        await server.accessRuntime.start();
    } else {
        await server.platformRuntime.engine.start();
    }

    await server.app.ready();

    const database =
        createIamIntegrationDatabase(
            server.platformRuntime.mongo.database,
        );

    return {
        server,
        database,

        async clean(): Promise<void> {
            await database.clean();
        },

        async close(): Promise<void> {
            await server.stop();
        },
    };
}

async function cleanBeforeRuntimeStart(
    config: ReturnType<typeof loadServerConfig>,
): Promise<void> {
    const client =
        new MongoClient(
            config.platformRuntime.mongodb.uri,
        );

    try {
        await client.connect();

        await createIamIntegrationDatabase(
            client.db(
                config.platformRuntime.mongodb.databaseName,
            ),
        ).clean();
    } finally {
        await client.close();
    }
}

function assertIntegrationEnvironment(): void {
    if (
        process.env.IAM_CERTIFICATION_ENVIRONMENT !==
        "integration"
    ) {
        throw new Error(
            "IAM_CERTIFICATION_ENVIRONMENT must be integration.",
        );
    }

    const databaseName =
        process.env.IAM_MONGODB_DATABASE?.trim();

    if (
        databaseName === undefined
        || !databaseName.endsWith("_test")
    ) {
        throw new Error(
            "IAM_MONGODB_DATABASE must identify an isolated _test database.",
        );
    }
}
