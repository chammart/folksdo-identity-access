// scripts/certification/prepare-local-certification.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ LOCAL ACCEPTANCE CERTIFICATION
// -----------------------------------------------------------------------------
// Owns the deterministic local IAM acceptance universe. It starts repository-
// owned MongoDB/NATS infrastructure, prepares real Identity/Membership/Access
// state through the hardened certification fixtures, projects Bruno variables,
// and exposes the real IAM HTTP server until the operator stops the process.
// -----------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createAccessAdministrativeContext } from "../../tests/e2e/access/support/access-authenticated-fixtures";
import { createMembershipCertificationContext } from "../../services/membership/tests/integration/membership-integration-fixtures";
import { closeIamIntegrationRuntime, getIamIntegrationRuntime } from "../../tests/integration/support/iam-integration-runtime";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFilePath = path.join(repositoryRoot, ".env.test");
const composeFilePath = path.join(repositoryRoot, "docker-compose.test.yml");
const collectionRoot = path.join(repositoryRoot, "acceptance", "bruno", "Folksdo IAM");
let stopping = false;

async function main(): Promise<void> {
    assertFile(
        envFilePath,
        "Missing .env.test. Copy .env.test.example to .env.test before local certification.",
    );

    loadEnvironmentFile(envFilePath);

    process.env.NODE_ENV = "test";
    process.env.IAM_CERTIFICATION_ENVIRONMENT = "integration";
    process.env.IAM_E2E_CERTIFICATION = "true";
    process.env.FOLKSDO_IAM_TEST_KEEP_INFRASTRUCTURE = "true";

    applyInfrastructureEnvironment(process.env);

    await dockerCompose(["up", "-d", "--wait"]);

    await waitForTcpPort(
        "127.0.0.1",
        readPort(process.env.FOLKSDO_IAM_TEST_MONGO_PORT, 37027),
        "MongoDB",
    );

    await initializeMongoReplicaSet();
    await waitForMongoPrimary();

    await waitForTcpPort(
        "127.0.0.1",
        readPort(process.env.FOLKSDO_IAM_TEST_NATS_PORT, 44227),
        "NATS",
    );

    const runtime = await getIamIntegrationRuntime();

    await runtime.clean();

    const administrator = await createAccessAdministrativeContext();
    const ordinaryMember = await createMembershipCertificationContext();

    writeBrunoEnvironment({
        administrator,
        ordinaryMember,
    });

    removeInvalidPatch4Folders();

    const port = readPort(process.env.PORT, 3110);

    await runtime.server.app.listen({
        host: "127.0.0.1",
        port,
    });

    const readiness = await runtime.server.app.inject({
        method: "GET",
        url: "/health/ready",
    });

    if (readiness.statusCode !== 200) {
        throw new Error(
            `IAM runtime is not ready: ${readiness.statusCode} ${readiness.body}`,
        );
    }

    console.info("Prepared IAM local certification environment.");
    console.info(`Bruno collection: ${collectionRoot}`);
    console.info("Environment: local");
    console.info(`Base URL: http://127.0.0.1:${port}`);
    console.info("Run folder: 01 - IAM");
    console.info("Press Ctrl+C when certification is complete.");

    process.once("SIGINT", () => void stop(0));
    process.once("SIGTERM", () => void stop(0));
}
async function stop(exitCode: number): Promise<void> {
    if (stopping) return;
    stopping = true;
    try { await closeIamIntegrationRuntime(); } catch (error) { console.error(error); exitCode = 1; }
    try { await dockerCompose(["down", "--volumes", "--remove-orphans"]); } catch (error) { console.error(error); exitCode = 1; }
    process.exit(exitCode);
}

function writeBrunoEnvironment(input: {
    readonly administrator: Awaited<ReturnType<typeof createAccessAdministrativeContext>>;
    readonly ordinaryMember: Awaited<ReturnType<typeof createMembershipCertificationContext>>;
}): void {
    const environments = path.join(collectionRoot, "environments");
    mkdirSync(environments, { recursive: true });
    const port = readPort(process.env.PORT, 3110);
    const yaml = `name: local\n\nvariables:\n  - name: baseUrl\n    value: "http://127.0.0.1:${port}"\n\n  - name: administratorIdentityId\n    value: "${input.administrator.identity.userId}"\n\n  - name: administratorEmail\n    value: "${input.administrator.identity.email}"\n\n  - name: administratorSessionId\n    value: "${input.administrator.sessionId}"\n\n  - name: administratorMembershipId\n    value: "${input.administrator.membershipId}"\n\n  - name: administratorTenantId\n    value: "${input.administrator.tenantId}"\n\n  - name: ordinaryMemberIdentityId\n    value: "${input.ordinaryMember.identity.userId}"\n\n  - name: ordinaryMemberSessionId\n    value: "${input.ordinaryMember.sessionId}"\n\n  - name: ordinaryMemberMembershipId\n    value: "${input.ordinaryMember.membershipId}"\n\n  - name: ordinaryMemberTenantId\n    value: "${input.ordinaryMember.tenantId}"\n`;
    writeFileSync(path.join(environments, "local.yml"), yaml, "utf8");
}

function removeInvalidPatch4Folders(): void {
    for (const relativePath of [
        path.join("acceptance", "bruno", "Folksdo Operations", "05 - IAM"),
        path.join("acceptance", "bruno", "Folksdo Operations", "13 - IAM"),
    ]) {
        rmSync(path.join(repositoryRoot, relativePath), { recursive: true, force: true });
    }
}

function applyInfrastructureEnvironment(environment: NodeJS.ProcessEnv): void {
    const mongoPort = readPort(environment.FOLKSDO_IAM_TEST_MONGO_PORT, 37027);
    const natsPort = readPort(environment.FOLKSDO_IAM_TEST_NATS_PORT, 44227);
    environment.IAM_MONGODB_URI = `mongodb://127.0.0.1:${mongoPort}/?replicaSet=rs0`;
    environment.IAM_NATS_URL = `nats://127.0.0.1:${natsPort}`;
}

async function initializeMongoReplicaSet(): Promise<void> {
    const port = readPort(process.env.FOLKSDO_IAM_TEST_MONGO_PORT, 37027);
    await dockerCompose(["exec", "-T", "mongo", "mongosh", "--port", String(port), "--quiet", "--eval", `try { rs.status(); } catch (error) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:${port}' }] }); }`]);
}

async function waitForMongoPrimary(): Promise<void> {
    const port = readPort(process.env.FOLKSDO_IAM_TEST_MONGO_PORT, 37027);
    await dockerCompose(["exec", "-T", "mongo", "mongosh", "--port", String(port), "--quiet", "--eval", "const deadline = Date.now() + 30000; while (!db.hello().isWritablePrimary) { if (Date.now() >= deadline) { throw new Error('MongoDB did not elect a writable primary.'); } sleep(250); }"]);
}

async function dockerCompose(args: readonly string[]): Promise<void> {
    await runCommand("docker", ["compose", "--project-name", process.env.FOLKSDO_IAM_TEST_COMPOSE_PROJECT ?? "folksdo-identity-access-test", "--env-file", envFilePath, "--file", composeFilePath, ...args]);
}

async function waitForTcpPort(host: string, port: number, serviceName: string): Promise<void> {
    for (let attempt = 1; attempt <= 60; attempt += 1) {
        if (await canConnect(host, port)) return;
        if (attempt === 60) throw new Error(`${serviceName} did not become reachable on ${host}:${port}.`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

function canConnect(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        socket.once("connect", () => { socket.end(); resolve(true); });
        socket.once("error", () => { socket.destroy(); resolve(false); });
        socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
    });
}

function loadEnvironmentFile(filePath: string): void {
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const separator = trimmed.indexOf("=");
        if (separator < 0) continue;
        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

function assertFile(filePath: string, message: string): void {
    if (!existsSync(filePath)) throw new Error(message);
}

function readPort(value: string | undefined, fallback: number): number {
    const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function runCommand(command: string, args: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
        const child = spawn(executable, [...args], { cwd: repositoryRoot, env: process.env, shell: false, stdio: "inherit" });
        child.once("error", reject);
        child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code ?? 1}: ${command} ${args.join(" ")}`)));
    });
}

void main().catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await stop(1);
});
