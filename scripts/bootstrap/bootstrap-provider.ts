// scripts/bootstrap/bootstrap-provider.ts
// -----------------------------------------------------------------------------
// SAIWALY IAM™ PROVIDER OPERATOR BOOTSTRAP
// -----------------------------------------------------------------------------
// Environment-neutral first-authority bootstrap. The command owns a temporary
// normal IAM runtime and delegates every business mutation to IAM capability
// use cases. It never writes IAM collections directly and never logs secrets.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import process from "node:process";
import { bootstrapServer } from "../../apps/server/src/bootstrap/bootstrap-server";
import { loadServerConfig } from "../../apps/server/src/config/server-config";

const PROVIDER_PERMISSIONS = [
    ["iam", "service", "view"], ["iam", "service", "release-view"], ["iam", "metrics", "view"],
    ["iam", "status", "view"], ["iam", "audit", "export"],
    ["identity", "identity", "list"], ["identity", "identity", "view"],
    ["membership", "member", "list"], ["membership", "member", "view"],
    ["access", "role", "list"], ["access", "role-assignment", "list"],
    ["access", "permission-assignment", "list"], ["access", "restriction", "list"],
    ["access", "effective-access", "view"], ["access", "explanation", "view"],
    ["access", "summary", "view"], ["access", "impact", "view"],
    ["identity", "session", "list"], ["identity", "session", "view"],
    ["identity", "session", "revoke"], ["identity", "session", "revoke-all"],
    ["identity", "recovery", "initiate"], ["identity", "identity", "suspend"],
    ["identity", "identity", "reactivate"], ["identity", "identity", "security-summary-view"],
    ["identity", "identity", "security-history-view"], ["iam", "activity", "provider-list"],
    ["iam", "timeline", "timeline-view"], ["iam", "investigation", "investigate"],
    ["iam", "search", "search"], ["iam", "policy", "view"], ["iam", "policy", "update"],
    ["iam", "tenant-policy", "view"],
] as const;

function required(...names: string[]): string {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value) return value;
    }
    throw new Error(`${names[0]} is required.`);
}

function context(tenantId: string) {
    const requestId = `request_${randomUUID()}`;
    return {
        requestId,
        correlationId: `correlation_${randomUUID()}`,
        actor: {
            actorId: "system:provider-bootstrap",
            actorType: "service" as const,
        },
        tenant: {
            tenantId,
            tenantType: "provider" as const,
        },
        permissions: [],
    };
}

async function waitForProviderMembership(runtime: Awaited<ReturnType<typeof bootstrapServer>>, userId: string, tenantId: string) {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
        const membership = await runtime.membershipRuntime.providerBootstrap.findProviderMembership(userId, tenantId);
        if (membership) return membership;
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error("Provider Membership did not become visible before the bootstrap timeout.");
}


async function invitationSignUpWithProjectionWait(
    runtime: Awaited<ReturnType<typeof bootstrapServer>>,
    input: {
        readonly invitationToken: string;
        readonly email: string;
        readonly password: string;
        readonly displayName: string;
        readonly locale: string;
        readonly timezone: string;
        readonly tenantId: string;
    },
) {
    const deadline = Date.now() + 15_000;
    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            return await runtime.identityRuntime.api.invitationSignUp({
                invitationToken: input.invitationToken,
                email: input.email,
                password: input.password,
                displayName: input.displayName,
                locale: input.locale,
                timezone: input.timezone,
            }, context(input.tenantId));
        } catch (error) {
            lastError = error;
            if (!(error instanceof Error) || error.message !== "Invitation was not found.") {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error("Provider invitation did not reach Identity before the bootstrap timeout.");
}

function bootstrapFailureDetail(error: unknown): string {
    const parts: string[] = [];
    const seen = new Set<object>();
    let current: unknown = error;
    let depth = 0;

    while (typeof current === "object" && current !== null && depth < 4) {
        if (seen.has(current)) {
            break;
        }
        seen.add(current);

        const candidate = current as {
            readonly name?: unknown;
            readonly code?: unknown;
            readonly message?: unknown;
            readonly cause?: unknown;
        };
        const prefix = depth === 0
            ? "error"
            : `cause${depth}`;

        if (typeof candidate.name === "string") {
            parts.push(`${prefix}=${candidate.name}`);
        }
        if (typeof candidate.code === "string" || typeof candidate.code === "number") {
            parts.push(`${prefix}Code=${String(candidate.code)}`);
        }
        if (depth > 0 && typeof candidate.message === "string") {
            parts.push(`${prefix}Message=${candidate.message}`);
        }

        current = candidate.cause;
        depth += 1;
    }

    if (parts.length > 0) {
        return parts.join(", ");
    }

    return error instanceof Error
        ? error.message
        : "unknown failure";
}

async function main(): Promise<void> {
    const environment = (process.env.NODE_ENV ?? "development").toLowerCase();
    const local = new Set(["development", "dev", "local", "test"]).has(environment);
    const email = process.env.IAM_PROVIDER_BOOTSTRAP_EMAIL?.trim()
        || process.env.IAM_LOCAL_PROVIDER_EMAIL?.trim()
        || (local ? "provider.admin@local.folksdo.test" : required("IAM_PROVIDER_BOOTSTRAP_EMAIL"));
    const password = process.env.IAM_PROVIDER_BOOTSTRAP_PASSWORD?.trim()
        || process.env.IAM_LOCAL_PROVIDER_PASSWORD?.trim()
        || (local ? "LocalProvider!Password1" : required("IAM_PROVIDER_BOOTSTRAP_PASSWORD"));
    const tenantId = process.env.IAM_PROVIDER_BOOTSTRAP_TENANT_ID?.trim()
        || process.env.IAM_LOCAL_PROVIDER_TENANT_ID?.trim()
        || (local ? "tenant_local_provider" : required("IAM_PROVIDER_BOOTSTRAP_TENANT_ID"));
    const displayName = process.env.IAM_PROVIDER_BOOTSTRAP_DISPLAY_NAME?.trim() || "Provider Administrator";

    const runtime = await bootstrapServer(loadServerConfig());
    try {
        await runtime.platformRuntime.start();
        await runtime.accessRuntime.start();

        let signedIn: Awaited<ReturnType<typeof runtime.identityRuntime.api.signIn>> | undefined;
        try {
            signedIn = await runtime.identityRuntime.api.signIn({ email, password }, context(tenantId));
        } catch {
            signedIn = undefined;
        }

        let userId: string;
        if (signedIn) {
            userId = signedIn.userId;
        } else {
            const invitation = await runtime.membershipRuntime.providerBootstrap.inviteProviderOperator(
                { tenantId, email }, context(tenantId),
            );
            if (!invitation.invitationToken) throw new Error("Provider invitation did not return its one-time bootstrap token.");

            const signup = await invitationSignUpWithProjectionWait(runtime, {
                invitationToken: invitation.invitationToken,
                email,
                password,
                displayName,
                locale: process.env.IAM_PROVIDER_BOOTSTRAP_LOCALE?.trim() || "en-CA",
                timezone: process.env.IAM_PROVIDER_BOOTSTRAP_TIMEZONE?.trim() || "America/Toronto",
                tenantId,
            });
            userId = signup.userId;
        }

        await waitForProviderMembership(runtime, userId, tenantId);
        const membership = await runtime.membershipRuntime.providerBootstrap.ensureProviderMembershipActive(
            userId,
            tenantId,
            context(tenantId),
        );
        for (const [service, resource, action] of PROVIDER_PERMISSIONS) {
            const permissionName = `${service}.${resource}.${action}`;
            let permissionId: string;

            try {
                permissionId = await runtime.accessRuntime.components.providerBootstrap.ensurePermission({
                    service, resource, action,
                    displayName: permissionName,
                    description: `Allows ${permissionName}.`,
                }, "system:provider-bootstrap");
            } catch (error) {
                throw new Error(
                    `Provider bootstrap failed while ensuring Permission ${permissionName}: ${bootstrapFailureDetail(error)}`,
                );
            }

            try {
                await runtime.accessRuntime.components.providerBootstrap.ensureGrant({
                    membershipId: membership.membershipId,
                    tenantId,
                    permissionId,
                    actorId: "system:provider-bootstrap",
                });
            } catch (error) {
                throw new Error(
                    `Provider bootstrap failed while ensuring grant ${permissionName}: ${bootstrapFailureDetail(error)}`,
                );
            }
        }

        console.info("Provider operator bootstrap completed.");
        console.info(`Environment: ${process.env.NODE_ENV?.trim() || "development"}`);
        console.info(`Email:       ${email}`);
        console.info(`Tenant:      ${tenantId}`);
        console.info("Credential:  configured (secret not displayed)");
    } finally {
        await runtime.stop();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Provider bootstrap failed.");
    process.exitCode = 1;
});
