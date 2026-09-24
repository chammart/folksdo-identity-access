// tests/integration/support/iam-integration-context.ts
// -----------------------------------------------------------------------------
// IAM INTEGRATION CONTEXT
// -----------------------------------------------------------------------------
// Constructs trusted Engine runtime contexts used by IAM certification.
// -----------------------------------------------------------------------------

import type {
    ServerRuntime,
} from "../../../apps/server/src/bootstrap/bootstrap-server";

type PlatformRuntime =
    ServerRuntime["platformRuntime"];

type RuntimeContext =
    ReturnType<PlatformRuntime["engine"]["engine"]["context"]["create"]>;

export interface CreateIamIntegrationContextInput {
    readonly requestId: string;
    readonly correlationId?: string;
    readonly actorId: string;
    readonly actorType?: "user" | "service" | "system" | "anonymous";
    readonly tenantId: string;
    readonly tenantType?: "customer" | "provider";
    readonly permissions?: readonly string[];
}

export function createIamIntegrationContext(
    platformRuntime: PlatformRuntime,
    input: CreateIamIntegrationContextInput,
): RuntimeContext {
    return platformRuntime.engine.engine.context.create({
        requestId:
            input.requestId,

        correlationId:
            input.correlationId ?? input.requestId,

        actor: {
            actorId:
                input.actorId,

            actorType:
                input.actorType ?? "user",
        },

        tenant: {
            tenantId:
                input.tenantId,

            tenantType:
                input.tenantType ?? "customer",
        },

        permissions:
            [...(input.permissions ?? [])],
    });
}
