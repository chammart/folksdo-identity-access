// scripts/development/prepare-local-infrastructure.ts
// -----------------------------------------------------------------------------
// PREPARE LOCAL INFRASTRUCTURE
// -----------------------------------------------------------------------------
// Owns repository-local MongoDB/NATS startup for IAM development.
//
// Responsibilities:
//   • start docker-compose.local.yml and wait for healthy containers
//   • initialize the MongoDB rs0 replica set idempotently
//   • wait until MongoDB has elected a writable primary
//
// This script owns local infrastructure only. It does not bootstrap IAM data.
// -----------------------------------------------------------------------------

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
);

const composeFilePath = path.join(
    repositoryRoot,
    "docker-compose.local.yml",
);

const mongoPort = 27_027;

async function main(): Promise<void> {
    await dockerCompose([
        "up",
        "-d",
        "--wait",
    ]);

    await initializeMongoReplicaSet();
    await waitForMongoPrimary();

    console.info("Folksdo IAM local infrastructure is ready.");
}

async function initializeMongoReplicaSet(): Promise<void> {
    const script =
        `try { rs.status(); } catch (error) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:${mongoPort}' }] }); }`;

    await dockerCompose([
        "exec",
        "-T",
        "mongo",
        "mongosh",
        "--port",
        String(mongoPort),
        "--quiet",
        "--eval",
        script,
    ]);
}

async function waitForMongoPrimary(): Promise<void> {
    const script =
        "const deadline = Date.now() + 30000; while (!db.hello().isWritablePrimary) { if (Date.now() >= deadline) { throw new Error('MongoDB did not elect a writable primary.'); } sleep(250); }";

    await dockerCompose([
        "exec",
        "-T",
        "mongo",
        "mongosh",
        "--port",
        String(mongoPort),
        "--quiet",
        "--eval",
        script,
    ]);
}

async function dockerCompose(args: readonly string[]): Promise<void> {
    await runCommand(
        "docker",
        [
            "compose",
            "--project-name",
            "folksdo-identity-access-local",
            "--file",
            composeFilePath,
            ...args,
        ],
    );
}

function runCommand(
    command: string,
    args: readonly string[],
): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(
            command,
            [...args],
            {
                cwd: repositoryRoot,
                env: process.env,
                shell: false,
                stdio: "inherit",
            },
        );

        child.once("error", reject);
        child.once(
            "exit",
            (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }

                reject(
                    new Error(
                        `Command failed with exit code ${code ?? 1}: ${command} ${args.join(" ")}`,
                    ),
                );
            },
        );
    });
}

void main().catch((error: unknown) => {
    console.error(
        error instanceof Error
            ? error.message
            : error,
    );
    process.exitCode = 1;
});
