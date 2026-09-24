// scripts/certification/prepare-staging-certification.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ STAGING ACCEPTANCE CERTIFICATION
// -----------------------------------------------------------------------------
// Validates an existing staging deployment and explicit IAM certification
// identities. Never starts infrastructure, seeds fixtures, or mutates staging.
// -----------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const collection = path.join(root, "acceptance", "bruno", "Folksdo IAM");
const names = [
    "IAM_STAGING_BASE_URL",
    "IAM_STAGING_ADMINISTRATOR_IDENTITY_ID",
    "IAM_STAGING_ADMINISTRATOR_EMAIL",
    "IAM_STAGING_ADMINISTRATOR_SESSION_ID",
    "IAM_STAGING_ADMINISTRATOR_MEMBERSHIP_ID",
    "IAM_STAGING_ADMINISTRATOR_TENANT_ID",
    "IAM_STAGING_ORDINARY_MEMBER_SESSION_ID",
] as const;

function required(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing required staging certification variable: ${name}`);
    if (/[\\r\\n]/u.test(value)) throw new Error(`Invalid newline in ${name}`);
    return value;
}

async function request(baseUrl: string, endpoint: string, session?: string): Promise<Response> {
    return await fetch(`${baseUrl}${endpoint}`, {
        headers: session === undefined ? { Accept: "application/json" } : {
            Accept: "application/json",
            Authorization: `Bearer ${session}`,
        },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
    });
}

async function main(): Promise<void> {
    const variables = Object.fromEntries(names.map((name) => [name, required(name)]));
    const baseUrl = variables.IAM_STAGING_BASE_URL.replace(/\/$/u, "");
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
        throw new Error("IAM_STAGING_BASE_URL must be an HTTPS origin or base path without credentials, query or fragment.");
    }
    const administrator = variables.IAM_STAGING_ADMINISTRATOR_SESSION_ID;
    const ordinary = variables.IAM_STAGING_ORDINARY_MEMBER_SESSION_ID;

    const ready = await request(baseUrl, "/health/ready");
    if (ready.status !== 200) throw new Error(`Staging readiness failed: HTTP ${ready.status}`);
    const health: unknown = await ready.json();
    if (!health || typeof health !== "object" || !("status" in health) || health.status !== "ready"
        || !("dependencies" in health) || !health.dependencies || typeof health.dependencies !== "object"
        || !("platformRuntime" in health.dependencies) || health.dependencies.platformRuntime !== true
        || !("accessRuntime" in health.dependencies) || health.dependencies.accessRuntime !== true) {
        throw new Error("Staging IAM runtime dependencies are not ready.");
    }

    const identity = await request(baseUrl, "/api/v1/identity/me", administrator);
    if (identity.status !== 200) throw new Error(`Staging administrator Identity check failed: HTTP ${identity.status}`);
    const actor: unknown = await identity.json();
    if (!actor || typeof actor !== "object" || !("userId" in actor)
        || actor.userId !== variables.IAM_STAGING_ADMINISTRATOR_IDENTITY_ID
        || !("email" in actor) || actor.email !== variables.IAM_STAGING_ADMINISTRATOR_EMAIL) {
        throw new Error("Staging administrator Identity does not match the configured fixture contract.");
    }

    const context = await request(baseUrl, "/api/v1/membership/current", administrator);
    if (context.status !== 200) throw new Error(`Staging administrator Membership check failed: HTTP ${context.status}`);
    const membership: unknown = await context.json();
    if (!membership || typeof membership !== "object"
        || !("identityId" in membership) || membership.identityId !== variables.IAM_STAGING_ADMINISTRATOR_IDENTITY_ID
        || !("activeMembershipId" in membership) || membership.activeMembershipId !== variables.IAM_STAGING_ADMINISTRATOR_MEMBERSHIP_ID
        || !("activeTenantId" in membership) || membership.activeTenantId !== variables.IAM_STAGING_ADMINISTRATOR_TENANT_ID) {
        throw new Error("Staging administrator Membership Context does not match the configured fixture contract.");
    }

    const adminAccess = await request(baseUrl, "/api/v1/access/permissions", administrator);
    if (adminAccess.status !== 200) throw new Error(`Staging administrator Access check failed: HTTP ${adminAccess.status}`);
    const ordinaryAccess = await request(baseUrl, "/api/v1/access/permissions", ordinary);
    if (ordinaryAccess.status !== 403) throw new Error(`Staging ordinary-member Access boundary failed: HTTP ${ordinaryAccess.status}`);
    const anonymous = await request(baseUrl, "/api/v1/membership/current");
    if (anonymous.status !== 401) throw new Error(`Staging anonymous authentication boundary failed: HTTP ${anonymous.status}`);

    const projection: Record<string, string> = {
        baseUrl,
        administratorIdentityId: variables.IAM_STAGING_ADMINISTRATOR_IDENTITY_ID,
        administratorEmail: variables.IAM_STAGING_ADMINISTRATOR_EMAIL,
        administratorSessionId: administrator,
        administratorMembershipId: variables.IAM_STAGING_ADMINISTRATOR_MEMBERSHIP_ID,
        administratorTenantId: variables.IAM_STAGING_ADMINISTRATOR_TENANT_ID,
        ordinaryMemberSessionId: ordinary,
    };
    const environment = path.join(collection, "environments", "staging.yml");
    mkdirSync(path.dirname(environment), { recursive: true });
    writeFileSync(environment, `name: staging\\n\\nvariables:\\n${Object.entries(projection)
        .map(([name, value]) => `  - name: ${name}\\n    value: ${JSON.stringify(value)}`).join("\\n")}\\n`, { encoding: "utf8", mode: 0o600 });
    console.info("IAM staging certification prepared and verified.");
    console.info("Bruno environment: staging");
    console.info("Run folder: 01 - IAM");
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
