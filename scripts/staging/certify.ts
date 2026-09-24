// scripts/staging/certify.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ STAGING CERTIFICATION GATE
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

interface Manifest {
    schemaVersion: number; environment: string; releaseId: string; baseUrl: string;
    administrator: { userId: string; sessionId: string; membershipId: string; tenantId: string; email: string };
    ordinaryMember: { sessionId: string };
}
function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; }
async function request(baseUrl: string, endpoint: string, session?: string): Promise<Response> { return await fetch(`${baseUrl}${endpoint}`, { headers: session ? { Accept: "application/json", Authorization: `Bearer ${session}` } : { Accept: "application/json" }, signal: AbortSignal.timeout(Number(process.env.STAGING_CERTIFICATION_TIMEOUT_MILLISECONDS ?? 15_000)), redirect: "error" }); }
async function main(): Promise<void> {
    const releaseId = required("STAGING_RELEASE_ID");
    const manifestPath = path.resolve(process.cwd(), required("STAGING_CERTIFICATION_MANIFEST_PATH"));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
    if (manifest.schemaVersion !== 1 || manifest.environment !== "staging" || manifest.releaseId !== releaseId) throw new Error("Staging certification manifest does not match this release.");
    const baseUrl = manifest.baseUrl.replace(/\/$/u, "");
    const ready = await request(baseUrl, "/health/ready");
    if (ready.status !== 200) throw new Error(`Readiness failed: HTTP ${ready.status}`);
    const health = await ready.json() as { status?: string; dependencies?: { platformRuntime?: boolean; accessRuntime?: boolean } };
    if (health.status !== "ready" || health.dependencies?.platformRuntime !== true || health.dependencies?.accessRuntime !== true) throw new Error("IAM runtime dependencies are not ready.");
    const identity = await request(baseUrl, "/api/v1/identity/me", manifest.administrator.sessionId);
    if (identity.status !== 200) throw new Error(`Administrator Identity failed: HTTP ${identity.status}`);
    const actor = await identity.json() as { userId?: string; email?: string };
    if (actor.userId !== manifest.administrator.userId || actor.email !== manifest.administrator.email) throw new Error("Administrator Identity contract mismatch.");
    const context = await request(baseUrl, "/api/v1/membership/current", manifest.administrator.sessionId);
    if (context.status !== 200) throw new Error(`Administrator Membership failed: HTTP ${context.status}`);
    const membership = await context.json() as { identityId?: string; activeMembershipId?: string; activeTenantId?: string };
    if (membership.identityId !== manifest.administrator.userId || membership.activeMembershipId !== manifest.administrator.membershipId || membership.activeTenantId !== manifest.administrator.tenantId) throw new Error("Administrator Membership Context contract mismatch.");
    if ((await request(baseUrl, "/api/v1/access/permissions", manifest.administrator.sessionId)).status !== 200) throw new Error("Administrator Access authority failed.");
    if ((await request(baseUrl, "/api/v1/access/permissions", manifest.ordinaryMember.sessionId)).status !== 403) throw new Error("Ordinary-member Access deny boundary failed.");
    if ((await request(baseUrl, "/api/v1/membership/current")).status !== 401) throw new Error("Anonymous authentication boundary failed.");
    console.info(`Folksdo IAM staging certification passed for release ${releaseId}.`);
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
