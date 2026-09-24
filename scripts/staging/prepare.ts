// scripts/staging/prepare.ts
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ STAGING CERTIFICATION PREPARATION
// -----------------------------------------------------------------------------
// Creates release-bound certification fixtures in staging. This command is
// intentionally staging-only and requires an explicit STAGING confirmation.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { MongoClient, type Db } from "mongodb";
import { ACCESS_ADMINISTRATIVE_PERMISSIONS } from "../../services/access/src/authorization";
import { membershipPermissions } from "../../services/membership/src/authorization";
import { seedKnownInvitation } from "../../services/identity/src/testing/seed-known-invitation";

interface IdentityFixture { userId: string; sessionId: string; membershipId: string; tenantId: string; email: string; }

function required(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required.`);
    return value;
}

async function jsonRequest(baseUrl: string, endpoint: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${baseUrl}${endpoint}`, { ...init, signal: AbortSignal.timeout(15_000) });
    const body = await response.text();
    if (!response.ok) throw new Error(`${endpoint} failed with HTTP ${response.status}: ${body}`);
    return body ? JSON.parse(body) as Record<string, unknown> : {};
}

async function createIdentity(database: Db, baseUrl: string, releaseId: string, role: string): Promise<IdentityFixture> {
    const suffix = randomUUID().replaceAll("-", "");
    const invitationId = `invitation_staging_${releaseId}_${suffix}`;
    const invitationToken = `staging-invitation-${suffix}`;
    const membershipId = `membership_staging_${releaseId}_${suffix}`;
    const tenantId = `tenant_staging_${releaseId}_${suffix}`;
    const email = `iam-staging-${role}-${suffix}@example.com`;
    const password = `Certification!${suffix}Aa1`;

    await seedKnownInvitation(database, {
        invitationId,
        targetTenantId: tenantId,
        invitedEmail: email,
        invitationToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const signup = await jsonRequest(baseUrl, "/api/v1/identity/invitation-sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationToken, email, password, displayName: `IAM Staging ${role}`, locale: "en-CA", timezone: "America/Toronto" }),
    });
    const userId = String(signup.userId ?? "");
    if (!userId) throw new Error("Identity signup did not return userId.");

    const verification = await database.collection("identity_email_verifications").findOne({ userId });
    const capture = await database.collection("identity_acceptance_captures").findOne({ kind: "email_verification", email });
    if (typeof verification?.verificationId !== "string" || typeof capture?.token !== "string") {
        throw new Error("Staging Identity verification capture was not created. IAM_IDENTITY_ACCEPTANCE_CAPTURE_ENABLED must be true in staging.");
    }

    await jsonRequest(baseUrl, "/api/v1/identity/verify-email", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ verificationId: verification.verificationId, verificationToken: capture.token }),
    });
    const signIn = await jsonRequest(baseUrl, "/api/v1/identity/sign-in", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    const sessionId = String(signIn.sessionId ?? "");
    if (!sessionId) throw new Error("Identity sign-in did not return sessionId.");

    const now = new Date().toISOString();
    await database.collection("membership_memberships").updateOne({ membershipId }, { $set: { membershipId, identityId: userId, tenantId, membershipType: "provider_operator", status: "active", activatedAt: now, createdAt: now, updatedAt: now } }, { upsert: true });
    await database.collection("membership_contexts").updateOne({ identityId: userId }, { $set: { identityId: userId, activeMembershipId: membershipId, activeTenantId: tenantId, activatedAt: now, updatedAt: now } }, { upsert: true });
    await database.collection("access_known_identities").updateOne({ identityId: userId }, { $set: { identityId: userId, status: "active", activatedAt: now, updatedAt: now } }, { upsert: true });
    await database.collection("access_known_memberships").updateOne({ membershipId }, { $set: { membershipId, identityId: userId, tenantId, membershipType: "provider_operator", status: "active", activatedAt: now, updatedAt: now } }, { upsert: true });
    await database.collection("access_known_tenants").updateOne({ tenantId }, { $set: { tenantId, status: "active", createdAt: now, updatedAt: now } }, { upsert: true });
    return { userId, sessionId, membershipId, tenantId, email };
}

async function grantAdministrator(database: Db, fixture: IdentityFixture): Promise<void> {
    const now = new Date().toISOString();
    const permissions = new Map<string, { service: string; resource: string; action: string }>();
    for (const permission of Object.values(ACCESS_ADMINISTRATIVE_PERMISSIONS)) permissions.set(permission.permissionId, permission);
    for (const permission of Object.values(membershipPermissions)) {
        const [service, resource, action] = permission.split(".");
        permissions.set(`permission_${service}_${resource}_${action}`, { service, resource, action });
    }
    for (const [permissionId, permission] of permissions) {
        await database.collection("access_permissions").updateOne({ permissionId }, { $set: { permissionId, ...permission, displayName: permissionId, description: `Allows ${permissionId}.`, classification: "administrative", createdAt: now } }, { upsert: true });
        await database.collection("access_permission_assignments").updateOne({ identityId: fixture.userId, membershipId: fixture.membershipId, tenantId: fixture.tenantId, permissionId, assignmentType: "grant" }, { $set: { assignmentId: `assignment_${randomUUID()}`, identityId: fixture.userId, membershipId: fixture.membershipId, tenantId: fixture.tenantId, permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, status: "active", assignedBy: "system:iam-staging-certification", effectiveFrom: now, activatedAt: now, suspensionSources: [], createdAt: now, updatedAt: now } }, { upsert: true });
    }
}

async function main(): Promise<void> {
    if (required("STAGING_PREPARATION_CONFIRM") !== "STAGING") throw new Error("STAGING_PREPARATION_CONFIRM must equal STAGING.");
    const baseUrl = required("STAGING_BASE_URL").replace(/\/$/u, "");
    const releaseId = required("STAGING_RELEASE_ID").replace(/[^a-zA-Z0-9_.-]/gu, "-");
    const mongoUri = required("IAM_MONGODB_URI");
    const databaseName = required("IAM_MONGODB_DATABASE");
    if (!databaseName.toLowerCase().includes("staging")) throw new Error("IAM_MONGODB_DATABASE must identify a staging database.");
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const database = client.db(databaseName);
        const administrator = await createIdentity(database, baseUrl, releaseId, "administrator");
        const ordinaryMember = await createIdentity(database, baseUrl, releaseId, "ordinary-member");
        await grantAdministrator(database, administrator);
        const manifest = { schemaVersion: 1, environment: "staging", releaseId, createdAt: new Date().toISOString(), baseUrl, administrator, ordinaryMember: { sessionId: ordinaryMember.sessionId, identityId: ordinaryMember.userId, membershipId: ordinaryMember.membershipId, tenantId: ordinaryMember.tenantId } };
        const manifestPath = path.resolve(process.cwd(), process.env.STAGING_CERTIFICATION_MANIFEST_PATH?.trim() || `.generated/staging/staging-certification-${releaseId}.json`);
        mkdirSync(path.dirname(manifestPath), { recursive: true });
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
        console.info(`Prepared IAM staging certification manifest: ${manifestPath}`);
    } finally { await client.close(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
