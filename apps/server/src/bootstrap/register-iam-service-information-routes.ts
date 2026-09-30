// apps/server/src/bootstrap/register-iam-service-information-routes.ts
// -----------------------------------------------------------------------------
// IAM SERVICE & RELEASE INFORMATION
// -----------------------------------------------------------------------------
// Host-owned, safe operational metadata for independently managed Folksdo IAM™.
// This surface exposes no credentials, connection strings, hostnames, database
// names, broker subjects, secrets or raw infrastructure configuration.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AccessApi, AccessApiRequestContext } from "@folksdo-identity-access/access";
import { AccessHttpError, translateAccessHttpError } from "@folksdo-identity-access/access";
import type { IdentityProviderReadSecurityResolver } from "@folksdo-identity-access/identity";
import { translateIdentityHttpError } from "@folksdo-identity-access/identity";
import type { AccessRuntime } from "@folksdo-identity-access/access";
import type { PlatformRuntime } from "@folksdo-platform/runtime";
import type { IamServiceInformationConfig } from "../config/server-config";

const CAPABILITIES = ["identity", "membership", "access"] as const;

export function registerIamServiceInformationRoutes(input: {
    readonly app: FastifyInstance;
    readonly config: IamServiceInformationConfig;
    readonly platformRuntime: PlatformRuntime;
    readonly accessRuntime: AccessRuntime;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get("/api/v1/admin/iam/service", async (request, reply) =>
        execute(request, reply, async () => {
            await authorize(input, request, reply, "view");
            const readiness = await resolveReadiness(input.platformRuntime, input.accessRuntime);
            return {
                service: {
                    id: input.config.serviceId,
                    environment: input.config.environment,
                    version: input.config.version,
                    capabilities: CAPABILITIES,
                    runtimeStatus: readiness.ready ? "ready" : "not_ready",
                },
                dependencies: readiness.dependencies,
            };
        }));

    input.app.get("/api/v1/admin/iam/release", async (request, reply) =>
        execute(request, reply, async () => {
            await authorize(input, request, reply, "release-view");
            return {
                releaseId: input.config.releaseId,
                version: input.config.version,
                environment: input.config.environment,
                ...(input.config.sourceRevision === undefined ? {} : { sourceRevision: input.config.sourceRevision }),
                ...(input.config.certifiedAt === undefined ? {} : { certifiedAt: input.config.certifiedAt }),
            };
        }));
}

export async function resolveIamOperationalReadiness(
    platformRuntime: PlatformRuntime,
    accessRuntime: AccessRuntime,
) {
    return await resolveReadiness(platformRuntime, accessRuntime);
}

async function resolveReadiness(platformRuntime: PlatformRuntime, accessRuntime: AccessRuntime) {
    const [platform, access] = await Promise.all([
        platformRuntime.isReady(),
        accessRuntime.validateReadiness(),
    ]);
    const dependencies = {
        platformRuntime: {
            status: platform.ready ? "ready" : "not_ready",
        },
        accessRuntime: {
            status: access.status === "ready" ? "ready" : "not_ready",
        },
    } as const;
    return {
        ready: platform.ready && access.status === "ready",
        dependencies,
    };
}

async function authorize(
    input: Pick<Parameters<typeof registerIamServiceInformationRoutes>[0], "accessApi" | "providerSecurityResolver" | "config">,
    request: FastifyRequest,
    reply: FastifyReply,
    action: "view" | "release-view",
): Promise<void> {
    const resolved = await input.providerSecurityResolver.resolvePlatform({ request, reply });
    const context: AccessApiRequestContext = {
        requestId: resolved.context.requestId,
        correlationId: resolved.context.correlationId ?? resolved.context.requestId,
        causationId: resolved.context.causationId,
        actor: { actorId: resolved.context.actor.actorId, actorType: "identity" },
        tenant: { tenantId: resolved.security.scope.tenantId, tenantType: "platform" },
        membershipId: resolved.security.scope.membershipId,
        permissions: [],
    };
    const decision = await input.accessApi.authorize({
        action: `iam.${action}`,
        resource: { type: "service", id: input.config.serviceId },
        membershipId: resolved.security.scope.membershipId,
        tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "IAM service information access is denied.");
}

async function execute(
    request: FastifyRequest,
    reply: FastifyReply,
    work: () => Promise<unknown>,
) {
    try {
        return await work();
    } catch (error) {
        const translated =
            translateAccessHttpError(error)
            ?? translateIdentityHttpError(error);
        if (translated !== undefined) {
            reply.status(translated.statusCode);
            return {
                error: {
                    code: translated.code,
                    message: translated.message,
                },
            };
        }
        throw error;
    }
}
