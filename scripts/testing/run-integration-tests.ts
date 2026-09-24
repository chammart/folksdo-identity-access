// scripts/testing/run-integration-tests.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ INTEGRATION CERTIFICATION RUNNER
// -----------------------------------------------------------------------------
// Repository-owned real-infrastructure orchestration.
//
// Purpose:
//   • make pnpm test:integration self-contained
//   • start MongoDB and NATS through repository-owned Docker Compose
//   • initialize MongoDB as a replica set for transaction support
//   • run IAM integration certification serially
//   • clean up infrastructure deterministically
//
// CI invokes this repository command only. Docker Compose remains an internal
// implementation detail that may later move to another infrastructure provider.
// -----------------------------------------------------------------------------

import {
    spawn,
} from "node:child_process";

import {
    existsSync,
    readFileSync,
} from "node:fs";

import net from "node:net";

import {
    createRequire,
} from "node:module";

import path from "node:path";

import process from "node:process";

import {
    fileURLToPath,
} from "node:url";

const currentFilePath =
    fileURLToPath(
        import.meta.url,
    );

const repositoryRoot =
    path.resolve(
        path.dirname(
            currentFilePath,
        ),
        "..",
        "..",
    );

const composeFilePath =
    path.join(
        repositoryRoot,
        "docker-compose.test.yml",
    );

const localEnvFilePath =
    path.join(
        repositoryRoot,
        ".env.test",
    );

const envFilePath =
    localEnvFilePath;

const require =
    createRequire(
        import.meta.url,
    );

const jestExecutablePath =
    require.resolve(
        "jest/bin/jest",
    );

async function main(): Promise<void> {
    assertEnvironmentFileExists();

    loadEnvironmentFile(
        envFilePath,
    );

    const environment:
        NodeJS.ProcessEnv = {
        ...process.env,

        NODE_ENV:
            "test",
    };

    applyInfrastructureEnvironment(
        environment,
    );

    const e2eOnly =
        process.argv.includes("--e2e");

    const keepInfrastructure =
        environment.FOLKSDO_IAM_TEST_KEEP_INFRASTRUCTURE
        === "true";

    let exitCode =
        0;

    try {
        await dockerCompose(
            [
                "up",
                "-d",
                "--wait",
            ],
            environment,
        );

        await waitForTcpPort({
            host:
                "127.0.0.1",

            port:
                readPort(
                    environment.FOLKSDO_IAM_TEST_MONGO_PORT,
                    37_027,
                ),

            serviceName:
                "MongoDB",
        });

        await initializeMongoReplicaSet(
            environment,
        );

        await waitForMongoPrimary(
            environment,
        );

        await waitForTcpPort({
            host:
                "127.0.0.1",

            port:
                readPort(
                    environment.FOLKSDO_IAM_TEST_NATS_PORT,
                    44_227,
                ),

            serviceName:
                "NATS",
        });

        if (e2eOnly) {
            await runCommand(
                process.execPath,
                [
                    "--disable-warning=ExperimentalWarning",
                    "--experimental-vm-modules",
                    jestExecutablePath,
                    "--config",
                    "jest.config.e2e.cjs",
                    "--runInBand",
                    "--detectOpenHandles",
                ],
                {
                    cwd: repositoryRoot,
                    env: {
                        ...environment,
                        IAM_E2E_CERTIFICATION: "true",
                    },
                },
            );
        } else {
        await runCommand(
            process.execPath,
            [
                "--disable-warning=ExperimentalWarning",
                "--experimental-vm-modules",
                jestExecutablePath,
                "--config",
                "jest.config.integration.cjs",
                "--runInBand",
                "--detectOpenHandles",
            ],
            {
                cwd:
                    repositoryRoot,

                env:
                    environment,
            },
        );

        await runCommand(
            process.execPath,
            [
                "--disable-warning=ExperimentalWarning",
                "--experimental-vm-modules",
                jestExecutablePath,
                "--config",
                "jest.config.reactions.cjs",
                "--runInBand",
                "--detectOpenHandles",
            ],
            {
                cwd:
                    repositoryRoot,

                env: {
                    ...environment,
                    IAM_REACTION_CERTIFICATION:
                        "true",
                },
            },
        );
        }
    } catch (
    error
    ) {
        exitCode =
            readFailureExitCode(
                error,
            );
    } finally {
        if (
            !keepInfrastructure
        ) {
            try {
                await dockerCompose(
                    [
                        "down",
                        "--volumes",
                        "--remove-orphans",
                    ],
                    environment,
                );
            } catch (
            cleanupError
            ) {
                console.error(
                    "Failed to clean up IAM integration infrastructure.",
                );

                console.error(
                    cleanupError,
                );

                exitCode =
                    1;
            }
        }
    }

    process.exit(
        exitCode,
    );
}

function applyInfrastructureEnvironment(
    environment:
        NodeJS.ProcessEnv,
): void {
    const mongoPort =
        readPort(
            environment.FOLKSDO_IAM_TEST_MONGO_PORT,
            37_027,
        );

    const natsPort =
        readPort(
            environment.FOLKSDO_IAM_TEST_NATS_PORT,
            44_227,
        );

    /*
     * The runner owns these endpoints. Inherited development values must never
     * redirect certification toward shared local or production infrastructure.
     */
    environment.IAM_MONGODB_URI =
        `mongodb://127.0.0.1:${mongoPort}/?replicaSet=rs0`;

    environment.IAM_NATS_URL =
        `nats://127.0.0.1:${natsPort}`;
}

function assertEnvironmentFileExists(): void {
    if (
        existsSync(
            envFilePath,
        )
    ) {
        return;
    }

    throw new Error(
        "Missing .env.test. Copy .env.test.example to .env.test before running integration certification.",
    );
}

async function initializeMongoReplicaSet(
    environment:
        NodeJS.ProcessEnv,
): Promise<void> {
    const mongoPort =
        readPort(
            environment.FOLKSDO_IAM_TEST_MONGO_PORT,
            37_027,
        );

    const script =
        `try { rs.status(); } catch (error) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:${mongoPort}' }] }); }`;

    await dockerCompose(
        [
            "exec",
            "-T",
            "mongo",
            "mongosh",
            "--port",
            String(
                mongoPort,
            ),
            "--quiet",
            "--eval",
            script,
        ],
        environment,
    );
}

// -----------------------------------------------------------------------------
// MONGODB PRIMARY READINESS
// -----------------------------------------------------------------------------
// A successful rs.initiate() only confirms that replica-set configuration was
// accepted. Transaction-capable tests must not start until MongoDB has elected
// a writable primary.
// -----------------------------------------------------------------------------

async function waitForMongoPrimary(
    environment:
        NodeJS.ProcessEnv,
): Promise<void> {
    const mongoPort =
        readPort(
            environment.FOLKSDO_IAM_TEST_MONGO_PORT,
            37_027,
        );

    const script =
        "const deadline = Date.now() + 30000; while (!db.hello().isWritablePrimary) { if (Date.now() >= deadline) { throw new Error('MongoDB did not elect a writable primary.'); } sleep(250); }";

    await dockerCompose(
        [
            "exec",
            "-T",
            "mongo",
            "mongosh",
            "--port",
            String(
                mongoPort,
            ),
            "--quiet",
            "--eval",
            script,
        ],
        environment,
    );
}

async function dockerCompose(
    args:
        readonly string[],

    environment:
        NodeJS.ProcessEnv,
): Promise<void> {
    await runCommand(
        "docker",
        [
            "compose",
            "--project-name",
            environment.FOLKSDO_IAM_TEST_COMPOSE_PROJECT
            ?? "folksdo-identity-access-test",
            "--env-file",
            envFilePath,
            "--file",
            composeFilePath,
            ...args,
        ],
        {
            cwd:
                repositoryRoot,

            env:
                environment,
        },
    );
}

function loadEnvironmentFile(
    filePath:
        string,
): void {
    if (
        !existsSync(
            filePath,
        )
    ) {
        return;
    }

    for (
        const line
        of readFileSync(
            filePath,
            "utf8",
        )
            .split(
                /\r?\n/u,
            )
    ) {
        const trimmed =
            line.trim();

        if (
            !trimmed
            || trimmed.startsWith(
                "#",
            )
        ) {
            continue;
        }

        const separatorIndex =
            trimmed.indexOf(
                "=",
            );

        if (
            separatorIndex ===
            -1
        ) {
            continue;
        }

        const key =
            trimmed
                .slice(
                    0,
                    separatorIndex,
                )
                .trim();

        const value =
            stripWrappingQuotes(
                trimmed
                    .slice(
                        separatorIndex + 1,
                    )
                    .trim(),
            );

        if (
            process.env[key] ===
            undefined
        ) {
            process.env[key] =
                value;
        }
    }
}

function stripWrappingQuotes(
    value:
        string,
): string {
    if (
        (
            value.startsWith(
                "\"",
            )
            && value.endsWith(
                "\"",
            )
        )
        || (
            value.startsWith(
                "'",
            )
            && value.endsWith(
                "'",
            )
        )
    ) {
        return value.slice(
            1,
            -1,
        );
    }

    return value;
}

async function waitForTcpPort(
    input: {
        readonly host:
        string;

        readonly port:
        number;

        readonly serviceName:
        string;
    },
): Promise<void> {
    for (
        let attempt = 1;
        attempt <= 60;
        attempt += 1
    ) {
        if (
            await canConnect(
                input.host,
                input.port,
            )
        ) {
            return;
        }

        if (
            attempt ===
            60
        ) {
            throw new Error(
                `${input.serviceName} did not become reachable on ${input.host}:${input.port}.`,
            );
        }

        await delay(
            1_000,
        );
    }
}

function canConnect(
    host:
        string,

    port:
        number,
): Promise<boolean> {
    return new Promise(
        (
            resolve,
        ) => {
            const socket =
                net.createConnection({
                    host,
                    port,
                });

            socket.once(
                "connect",
                () => {
                    socket.end();
                    resolve(
                        true,
                    );
                },
            );

            socket.once(
                "error",
                () => {
                    socket.destroy();
                    resolve(
                        false,
                    );
                },
            );

            socket.setTimeout(
                1_000,
                () => {
                    socket.destroy();
                    resolve(
                        false,
                    );
                },
            );
        },
    );
}

function delay(
    milliseconds:
        number,
): Promise<void> {
    return new Promise(
        (
            resolve,
        ) => {
            setTimeout(
                resolve,
                milliseconds,
            );
        },
    );
}

function runCommand(
    command:
        string,

    args:
        readonly string[],

    options: {
        readonly cwd:
        string;

        readonly env:
        NodeJS.ProcessEnv;
    },
): Promise<void> {
    return new Promise(
        (
            resolve,
            reject,
        ) => {
            const child =
                spawn(
                    resolveExecutable(
                        command,
                    ),
                    [
                        ...args,
                    ],
                    {
                        cwd:
                            options.cwd,

                        env:
                            options.env,

                        shell:
                            false,

                        stdio:
                            "inherit",
                    },
                );

            child.once(
                "error",
                reject,
            );

            child.once(
                "exit",
                (
                    code,
                ) => {
                    if (
                        code ===
                        0
                    ) {
                        resolve();

                        return;
                    }

                    reject(
                        new CommandFailedError(
                            command,
                            args,
                            code ?? 1,
                        ),
                    );
                },
            );
        },
    );
}

function resolveExecutable(
    command:
        string,
): string {
    if (
        process.platform ===
        "win32"
        && command ===
        "pnpm"
    ) {
        return "pnpm.cmd";
    }

    return command;
}

class CommandFailedError
extends Error {
    public constructor(
        command:
            string,

        args:
            readonly string[],

        public readonly exitCode:
            number,
    ) {
        super(
            `Command failed with exit code ${exitCode}: ${command} ${args.join(" ")}`,
        );

        this.name =
            "CommandFailedError";
    }
}

function readFailureExitCode(
    error:
        unknown,
): number {
    if (
        error instanceof
        CommandFailedError
    ) {
        return error.exitCode;
    }

    console.error(
        error instanceof Error
            ? error.message
            : error,
    );

    return 1;
}

function readPort(
    value:
        string | undefined,

    fallback:
        number,
): number {
    const parsed =
        value === undefined
        ? fallback
        : Number.parseInt(
            value,
            10,
        );

    return Number.isNaN(
        parsed,
    )
        ? fallback
        : parsed;
}

void main();
