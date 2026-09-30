// apps/server/src/bootstrap/register-iam-operational-status-routes.ts
// -----------------------------------------------------------------------------
// IAM OPERATIONAL STATUS
// -----------------------------------------------------------------------------
// Provider-operational composition of safe service/release/readiness/processing
// facts. Canonical business state remains owned by Identity/Membership/Access.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import type { AccessRuntime, AccessApi, AccessApiRequestContext } from "@folksdo-identity-access/access";
import { AccessHttpError, translateAccessHttpError } from "@folksdo-identity-access/access";
import type { IdentityProviderReadSecurityResolver } from "@folksdo-identity-access/identity";
import { translateIdentityHttpError } from "@folksdo-identity-access/identity";
import type { PlatformRuntime } from "@folksdo-platform/runtime";
import type { IamServiceInformationConfig } from "../config/server-config";
import { resolveIamOperationalReadiness } from "./register-iam-service-information-routes";

export function registerIamOperationalStatusRoutes(input: {
    readonly app: FastifyInstance;
    readonly database: Db;
    readonly config: IamServiceInformationConfig;
    readonly platformRuntime: PlatformRuntime;
    readonly accessRuntime: AccessRuntime;
    readonly accessApi: AccessApi;
    readonly providerSecurityResolver: IdentityProviderReadSecurityResolver;
}): void {
    input.app.get("/api/v1/admin/iam/status", async (request, reply) =>
        execute(request, reply, async () => {
            await authorize(input, request, reply);
            const readiness = await resolveIamOperationalReadiness(input.platformRuntime, input.accessRuntime);
            const failures = await input.database.collection<Record<string, unknown>>("engine_projection_failures")
                .find({})
                .sort({ failedAt: -1, createdAt: -1, _id: -1 })
                .limit(10)
                .toArray();
            const pendingOutbox = await input.database.collection("engine_outbox")
                .countDocuments({ status: { $in: ["pending", "failed"] } });
            return {
                service: {
                    id: input.config.serviceId,
                    environment: input.config.environment,
                    version: input.config.version,
                    capabilities: ["identity", "membership", "access"],
                },
                release: {
                    releaseId: input.config.releaseId,
                    version: input.config.version,
                    ...(input.config.sourceRevision === undefined ? {} : { sourceRevision: input.config.sourceRevision }),
                    ...(input.config.certifiedAt === undefined ? {} : { certifiedAt: input.config.certifiedAt }),
                },
                health: { status: "alive" },
                readiness: {
                    status: readiness.ready ? "ready" : "not_ready",
                    dependencies: readiness.dependencies,
                },
                processing: {
                    pendingOutbox,
                    recentFailureCount: failures.length,
                },
                recentOperationalFailures: failures.map(toSafeFailure),
            };
        }));
}

function toSafeFailure(failure: Record<string, unknown>) {
    return {
        failureId: stringOrNull(failure.failureId) ?? stringOrNull(failure._id),
        projection: stringOrNull(failure.projectionName) ?? stringOrNull(failure.projection),
        eventId: stringOrNull(failure.eventId),
        eventType: stringOrNull(failure.eventType),
        occurredAt: stringOrNull(failure.failedAt) ?? stringOrNull(failure.createdAt),
        requestId: nestedString(failure, "metadata", "requestId"),
        correlationId: nestedString(failure, "metadata", "correlationId"),
        tenantId: stringOrNull(failure.tenantId) ?? nestedString(failure, "metadata", "tenantId"),
    };
}
function stringOrNull(value: unknown): string | null {
    if (typeof value === "string" && value.length > 0) return value;
    if (value && typeof value === "object" && "toString" in value) return String(value);
    return null;
}
function nestedString(value: Record<string, unknown>, key: string, child: string): string | null {
    const nested = value[key];
    return nested && typeof nested === "object" ? stringOrNull((nested as Record<string, unknown>)[child]) : null;
}

async function authorize(
    input: Pick<Parameters<typeof registerIamOperationalStatusRoutes>[0], "accessApi" | "providerSecurityResolver">,
    request: FastifyRequest,
    reply: FastifyReply,
) {
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
        action: "iam.view", resource: { type: "status", id: "service" },
        membershipId: resolved.security.scope.membershipId, tenantId: resolved.security.scope.tenantId,
    }, context);
    if (!decision.allowed) throw new AccessHttpError(403, "access_denied", "IAM operational status access is denied.");
}
async function execute(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
    try { return reply.status(200).send(await operation()); }
    catch (error) {
        const identity = translateIdentityHttpError(error);
        const accessError = translateAccessHttpError(error);
        const access = { statusCode: accessError.statusCode, body: accessError.toResponseBody() };
        const translated = [identity, access].find(candidate => candidate.statusCode < 500) ?? identity;
        request.log.error({ requestId: request.id, route: "iam-operational-status", error }, "IAM operational status lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
