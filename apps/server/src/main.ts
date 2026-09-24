// apps/server/src/main.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM SERVER
// -----------------------------------------------------------------------------
// Production process lifecycle for the independently deployed Identity,
// Membership, and Access service.
// -----------------------------------------------------------------------------

import type { ServerRuntime } from "./bootstrap/bootstrap-server";
import { bootstrapServer } from "./bootstrap/bootstrap-server";
import { loadServerConfig } from "./config/server-config";

async function main(): Promise<void> {
    const runtime = await bootstrapServer(loadServerConfig());
    registerShutdownHandlers(runtime);
    await runtime.start();
}

function registerShutdownHandlers(runtime: Pick<ServerRuntime, "stop">): void {
    let shutdownStarted = false;

    const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
        if (shutdownStarted) return;
        shutdownStarted = true;
        console.info(`Received ${signal}. Shutting down Folksdo IAM Server.`);

        try {
            await runtime.stop();
            console.info("Folksdo IAM Server stopped successfully.");
            process.exitCode = 0;
        } catch (error) {
            console.error("Folksdo IAM Server shutdown failed.", error);
            process.exitCode = 1;
        }
    };

    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((error: unknown) => {
    console.error("Folksdo IAM Server failed to start.", error);
    process.exitCode = 1;
});
