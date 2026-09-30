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
import { registerTenantPeopleRoutes } from "./register-tenant-people-routes";
import { registerIamPersonDetailRoutes } from "./register-iam-person-detail-routes";
import { registerTenantIamActivityRoutes } from "./register-tenant-iam-activity-routes";
import { registerProviderIamActivityRoutes } from "./register-provider-iam-activity-routes";
import { registerProviderIamInvestigationRoutes } from "./register-provider-iam-investigation-routes";
import { registerProviderIamPolicyRoutes } from "./register-provider-iam-policy-routes";
import { registerTenantIamPolicyRoutes } from "./register-tenant-iam-policy-routes";
import { registerAccessReviewRoutes } from "./register-access-review-routes";
import { registerIamServiceInformationRoutes, resolveIamOperationalReadiness } from "./register-iam-service-information-routes";
import { registerIamOperationalMetricsRoutes } from "./register-iam-operational-metrics-routes";
import { registerIamOperationalStatusRoutes } from "./register-iam-operational-status-routes";
import { registerIamAuditExportRoutes } from "./register-iam-audit-export-routes";

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
    const identityProviderReadSecurityResolver = createAuthenticatedIdentityProviderReadSecurityResolver({
        engine: input.platformRuntime.engine.engine,
        authenticatedContextResolver: authenticatedIdentityContextResolver,
        getMembershipApi() {
            if (membershipApi === undefined) throw new Error("Membership API is unavailable during Identity provider-read initialization.");
            return membershipApi;
        },
    });
    const identityRuntime = await bootstrapIdentityService({
        app: input.app,
        platformRuntime: input.platformRuntime,
        config: input.config.identity,
        authenticatedContextResolver: authenticatedIdentityContextResolver,
        providerReadSecurityResolver: identityProviderReadSecurityResolver,
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
        resolveInvitationDefaultTtlMilliseconds: async tenantId =>
            resolveInvitationDefaultTtlMilliseconds(
                input.platformRuntime.mongo.database,
                tenantId,
            ),
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

    registerAccessReviewRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        engine: input.platformRuntime.engine.engine,
        accessApi: accessRuntime.components.api,
        contextResolver: createAuthenticatedAccessContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
            membershipApi: membershipRuntime.api,
        }),
    });

    registerIamServiceInformationRoutes({
        app: input.app,
        config: input.config.serviceInformation,
        platformRuntime: input.platformRuntime,
        accessRuntime,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });

    registerIamOperationalMetricsRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
        tenantContextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
    });

    registerIamOperationalStatusRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        config: input.config.serviceInformation,
        platformRuntime: input.platformRuntime,
        accessRuntime,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });

    registerIamAuditExportRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
        tenantContextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
    });

    registerTenantPeopleRoutes({
        app: input.app,
        identityApi: identityRuntime.api,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        contextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
    });

    registerProviderIamInvestigationRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });

    registerProviderIamActivityRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });

    registerProviderIamPolicyRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        engine: input.platformRuntime.engine.engine,
        accessApi: accessRuntime.components.api,
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });

    registerTenantIamActivityRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        contextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
    });

    registerTenantIamPolicyRoutes({
        app: input.app,
        database: input.platformRuntime.mongo.database,
        engine: input.platformRuntime.engine.engine,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        contextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
    });

    registerIamPersonDetailRoutes({
        app: input.app,
        identityApi: identityRuntime.api,
        membershipApi: membershipRuntime.api,
        accessApi: accessRuntime.components.api,
        tenantContextResolver: createAuthenticatedMembershipContextResolver({
            engine: input.platformRuntime.engine.engine,
            identityApi: identityRuntime.api,
        }),
        providerSecurityResolver: identityProviderReadSecurityResolver,
    });
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
        const readiness = await resolveIamOperationalReadiness(
            input.platformRuntime,
            input.accessRuntime,
        );
        if (!readiness.ready) reply.status(503);
        return {
            status: readiness.ready ? "ready" : "not_ready",
            dependencies: {
                platformRuntime: readiness.dependencies.platformRuntime.status === "ready",
                accessRuntime: readiness.dependencies.accessRuntime.status === "ready",
            },
            operationalDependencies: readiness.dependencies,
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


async function resolveInvitationDefaultTtlMilliseconds(
    database: import("mongodb").Db,
    tenantId: string,
): Promise<number | undefined> {
    const provider = await database.collection<{
        version: number;
        invitations: { defaultExpiryHours: number; maxExpiryHours: number };
        tenantDelegation?: { invitations?: { defaultExpiryHours?: { min: number; max: number } } };
    }>("iam_provider_policies").findOne({ policyId: "provider-default" });
    if (provider === null) return undefined;

    const tenant = await database.collection<{
        overrides?: { invitations?: { defaultExpiryHours?: number } };
    }>("iam_tenant_policies").findOne({ tenantId });
    const override = tenant?.overrides?.invitations?.defaultExpiryHours;
    const delegated = provider.tenantDelegation?.invitations?.defaultExpiryHours;
    const effectiveHours =
        override !== undefined
        && delegated !== undefined
        && override >= delegated.min
        && override <= delegated.max
        && override <= provider.invitations.maxExpiryHours
            ? override
            : provider.invitations.defaultExpiryHours;

    return effectiveHours * 60 * 60 * 1000;
}
