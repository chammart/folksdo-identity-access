// apps/server/src/bootstrap/bootstrap-server.ts
// -----------------------------------------------------------------------------
// BOOTSTRAP IAM SERVER
// -----------------------------------------------------------------------------
// Composes Platform Runtime and the Identity → Membership → Access security
// chain. Business behavior remains inside the owning capability.
// -----------------------------------------------------------------------------

import Fastify, { type FastifyInstance } from "fastify";
import { bootstrapAccessService, type AccessRuntime } from "@folksdo-identity-access/access";
import { bootstrapIdentityService, type IdentityApi } from "@folksdo-identity-access/identity";
import { bootstrapMembershipService, type MembershipApi, type MembershipRuntime } from "@folksdo-identity-access/membership";
import { createPlatformRuntime, type PlatformRuntime } from "@folksdo-platform/runtime";
import { createAuthenticatedAccessContextResolver } from "../authentication/create-authenticated-access-context-resolver";
import { createAuthenticatedIdentityContextResolver } from "../authentication/create-authenticated-identity-context-resolver";
import { createAuthenticatedIdentityProviderReadSecurityResolver } from "../authentication/create-authenticated-identity-provider-read-security-resolver";
import { createAuthenticatedMembershipContextResolver } from "../authentication/create-authenticated-membership-context-resolver";
import { createIdentityAccessAuthorizer } from "../authorization/create-identity-access-authorizer";
import { createMembershipAccessAuthorizer } from "../authorization/create-membership-access-authorizer";
import type { ServerConfig } from "../config/server-config";

export interface ServerRuntime {
    readonly app: FastifyInstance;
    readonly platformRuntime: PlatformRuntime;
    readonly membershipRuntime: MembershipRuntime;
    readonly accessRuntime: AccessRuntime;
    start(): Promise<void>;
    stop(): Promise<void>;
}

export async function bootstrapServer(config: ServerConfig): Promise<ServerRuntime> {
    const app = Fastify({
        logger: { level: config.logLevel },
        exposeHeadRoutes: true,
    });

    let platformRuntime: PlatformRuntime | undefined;
    let accessRuntime: AccessRuntime | undefined;

    try {
        platformRuntime = await createPlatformRuntime({ config: config.platformRuntime });
        const services = await bootstrapServices({ app, platformRuntime, config });
        accessRuntime = services.accessRuntime;

        registerHealthRoutes({ app, platformRuntime, accessRuntime });

        return createServerRuntime({
            app,
            platformRuntime,
            membershipRuntime: services.membershipRuntime,
            accessRuntime,
            port: config.port,
        });
    } catch (error) {
        await cleanupFailedBootstrap({ app, platformRuntime, accessRuntime });
        throw error;
    }
}

async function bootstrapServices(input: {
    readonly app: FastifyInstance;
    readonly platformRuntime: PlatformRuntime;
    readonly config: ServerConfig;
}): Promise<{
    readonly membershipRuntime: MembershipRuntime;
    readonly accessRuntime: AccessRuntime;
}> {
    let identityApi: IdentityApi | undefined;
    let membershipApi: MembershipApi | undefined;

    const authenticatedIdentityContextResolver = createAuthenticatedIdentityContextResolver({
        engine: input.platformRuntime.engine.engine,
        getIdentityApi() {
            if (identityApi === undefined) throw new Error("Identity API is unavailable during authentication initialization.");
            return identityApi;
        },
    });

    const identityAccessAuthorizer = createIdentityAccessAuthorizer();
    const identityRuntime = await bootstrapIdentityService({
        app: input.app,
        platformRuntime: input.platformRuntime,
        config: input.config.identity,
        authenticatedContextResolver: authenticatedIdentityContextResolver,
        providerReadSecurityResolver: createAuthenticatedIdentityProviderReadSecurityResolver({
            engine: input.platformRuntime.engine.engine,
            authenticatedContextResolver: authenticatedIdentityContextResolver,
            getMembershipApi() {
                if (membershipApi === undefined) throw new Error("Membership API is unavailable during Identity provider-read initialization.");
                return membershipApi;
            },
        }),
        accessAuthorizer: identityAccessAuthorizer,
    });
    identityApi = identityRuntime.api;

    // Membership requires Access for administrative authorization while Access
    // requires Membership for active-context resolution. This adapter fails
    // closed until the real Access API is bound.
    const membershipAccessAuthorizer = createMembershipAccessAuthorizer();
    const membershipRuntime = await bootstrapMembershipService({
        app: input.app,
        platformRuntime: input.platformRuntime,
        config: input.config.membership,
        contextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
        accessAuthorizer: membershipAccessAuthorizer,
    });
    membershipApi = membershipRuntime.api;

    const accessRuntime = await bootstrapAccessService({
        app: input.app,
        platformRuntime: input.platformRuntime,
        config: input.config.access,
        contextResolver: createAuthenticatedAccessContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
            membershipApi: membershipRuntime.api,
        }),
    });

    membershipAccessAuthorizer.bind(accessRuntime.components.api);
    identityAccessAuthorizer.bind(accessRuntime.components.api);
    return {
        membershipRuntime,
        accessRuntime,
    };
}

function registerHealthRoutes(input: {
    readonly app: FastifyInstance;
    readonly platformRuntime: PlatformRuntime;
    readonly accessRuntime: AccessRuntime;
}): void {
    input.app.get("/health/live", async () => ({ status: "alive" }));
    input.app.get("/health/ready", async (_request, reply) => {
        const [platform, access] = await Promise.all([
            input.platformRuntime.isReady(),
            input.accessRuntime.validateReadiness(),
        ]);
        const ready = platform.ready && access.status === "ready";
        if (!ready) reply.status(503);
        return {
            status: ready ? "ready" : "not_ready",
            dependencies: {
                platformRuntime: platform.ready,
                accessRuntime: access.status === "ready",
            },
        };
    });
}

function createServerRuntime(input: {
    readonly app: FastifyInstance;
    readonly platformRuntime: PlatformRuntime;
    readonly membershipRuntime: MembershipRuntime;
    readonly accessRuntime: AccessRuntime;
    readonly port: number;
}): ServerRuntime {
    let started = false;
    return {
        app: input.app,
        platformRuntime: input.platformRuntime,
        membershipRuntime: input.membershipRuntime,
        accessRuntime: input.accessRuntime,
        async start() {
            if (started) return;
            await input.platformRuntime.start();
            try {
                await input.accessRuntime.start();
                await input.app.listen({ host: "0.0.0.0", port: input.port });
                started = true;
            } catch (error) {
                const cleanupErrors = await stopRuntimeDependencies(input);
                if (cleanupErrors.length > 0) {
                    throw new AggregateError([error, ...cleanupErrors], "Folksdo IAM Server startup failed and cleanup encountered errors.");
                }
                throw error;
            }
        },
        async stop() {
            started = false;
            const errors = await stopRuntimeDependencies(input);
            if (errors.length > 0) throw new AggregateError(errors, "Folksdo IAM Server shutdown failed.");
        },
    };
}

async function stopRuntimeDependencies(input: {
    readonly app: FastifyInstance;
    readonly accessRuntime: AccessRuntime;
    readonly platformRuntime: PlatformRuntime;
}): Promise<unknown[]> {
    const errors: unknown[] = [];
    for (const stop of [
        async () => await closeFastifyApp(input.app),
        async () => await input.accessRuntime.stop(),
        async () => await input.platformRuntime.stop(),
    ]) {
        try {
            await stop();
        } catch (error) {
            errors.push(error);
        }
    }
    return errors;
}

async function cleanupFailedBootstrap(input: {
    readonly app: FastifyInstance;
    readonly platformRuntime?: PlatformRuntime;
    readonly accessRuntime?: AccessRuntime;
}): Promise<void> {
    const errors: unknown[] = [];
    try {
        await closeFastifyApp(input.app);
    } catch (error) {
        errors.push(error);
    }
    if (input.accessRuntime) {
        try {
            await input.accessRuntime.stop();
        } catch (error) {
            errors.push(error);
        }
    }
    if (input.platformRuntime) {
        try {
            await input.platformRuntime.stop();
        } catch (error) {
            errors.push(error);
        }
    }
    if (errors.length > 0) throw new AggregateError(errors, "Folksdo IAM Server bootstrap cleanup failed.");
}

async function closeFastifyApp(app: FastifyInstance): Promise<void> {
    try {
        await app.close();
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("not started")) throw error;
    }
}
