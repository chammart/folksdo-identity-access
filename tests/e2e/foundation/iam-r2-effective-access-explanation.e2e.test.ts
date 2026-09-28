// tests/e2e/foundation/iam-r2-effective-access-explanation.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R2 EFFECTIVE ACCESS & EXPLANATION E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Release-level certification for the R2 administration intelligence contract.
//
// Proves through the real IAM runtime:
//   • role-derived and direct effective Access
//   • effective dates and expiry filtering
//   • Access Explanation consistency with canonical authorization semantics
//   • Access Summary consistency with effective Access
//   • provider-owned privileged permission classification
//   • derived privileged Role classification
//   • pre-change Role impact
//   • tenant isolation across every R2 administration read
//
// No HTTP mocks. Fixture writes establish deterministic Access prerequisites;
// Identity and Membership validity are established through their real lifecycle
// and reaction paths.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";

import { createActiveIdentity } from "../../../services/identity/tests/integration/identity-integration-fixtures";
import { membershipPost } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { waitForIamCondition } from "../../integration/support/iam-outbox-assertions";
import {
    accessHttp,
    createAccessAdministrativeContext,
} from "../access/support/access-authenticated-fixtures";

describe("IAM R2 Effective Access & Explanation release gate", () => {
    it("keeps Effective Access, Explanation, Summary, privilege and Impact consistent", async () => {
        const administrator = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const database = runtime.database.database;

        const targetIdentity = await createActiveIdentity();
        await waitForKnownIdentityStatus(runtime, targetIdentity.userId, "active");

        const membershipResponse = await membershipPost(
            runtime,
            "/api/v1/membership",
            {
                identityId: targetIdentity.userId,
                tenantId: administrator.tenantId,
                membershipType: "member",
                activate: true,
            },
            administrator.sessionId,
        );

        expect(membershipResponse.statusCode).toBe(201);

        const membershipId = String(membershipResponse.json().membershipId);
        await waitForKnownMembershipStatus(runtime, membershipId, "active");

        const now = Date.now();
        const effectiveFrom = new Date(now - 60_000).toISOString();
        const expiresAt = new Date(now + 3_600_000).toISOString();
        const expiredAt = new Date(now - 120_000).toISOString();
        const expiredFrom = new Date(now - 3_600_000).toISOString();
        const futureFrom = new Date(now + 3_600_000).toISOString();
        const futureExpiry = new Date(now + 7_200_000).toISOString();

        const rolePermissionId = `cert.r2.role.${randomUUID()}`;
        const restrictedPermissionId = `cert.r2.restricted.${randomUUID()}`;
        const expiredPermissionId = `cert.r2.expired.${randomUUID()}`;
        const futurePermissionId = `cert.r2.future.${randomUUID()}`;
        const privilegedPermissionId = "access.role.archive";

        for (const permissionId of [
            rolePermissionId,
            restrictedPermissionId,
            expiredPermissionId,
            futurePermissionId,
            privilegedPermissionId,
        ]) {
            const [service, resource, action] = permissionId.split(".") as [string, string, string];

            await database.collection("access_permissions").updateOne(
                { permissionId },
                {
                    $set: {
                        permissionId,
                        service,
                        resource,
                        action,
                        displayName: permissionId,
                        description: `R2 certification permission ${permissionId}.`,
                        classification: "administrative",
                        createdAt: effectiveFrom,
                    },
                },
                { upsert: true },
            );
        }

        const roleId = `role_${randomUUID()}`;
        const roleAssignmentId = `assignment_${randomUUID()}`;
        const directAssignmentId = `assignment_${randomUUID()}`;
        const expiredAssignmentId = `assignment_${randomUUID()}`;
        const futureAssignmentId = `assignment_${randomUUID()}`;
        const restrictionId = `restriction_${randomUUID()}`;

        await database.collection("access_roles").insertOne({
            roleId,
            roleKey: `r2-release-${randomUUID()}`,
            roleName: "R2 Release Certification Role",
            description: "R2 release gate role.",
            roleType: "tenant",
            tenantId: administrator.tenantId,
            lifecycleStatus: "active",
            permissionIds: [rolePermissionId, privilegedPermissionId],
            createdBy: administrator.identity.userId,
            createdAt: effectiveFrom,
            updatedAt: effectiveFrom,
            activatedAt: effectiveFrom,
        });

        await database.collection("access_role_assignments").insertOne({
            assignmentId: roleAssignmentId,
            identityId: targetIdentity.userId,
            membershipId,
            tenantId: administrator.tenantId,
            roleId,
            status: "active",
            assignedBy: administrator.identity.userId,
            effectiveFrom,
            expiresAt,
            suspensionSources: [],
            createdAt: effectiveFrom,
            updatedAt: effectiveFrom,
        });

        for (const assignment of [
            {
                assignmentId: directAssignmentId,
                permissionId: restrictedPermissionId,
                effectiveFrom,
                expiresAt,
            },
            {
                assignmentId: expiredAssignmentId,
                permissionId: expiredPermissionId,
                effectiveFrom: expiredFrom,
                expiresAt: expiredAt,
            },
            {
                assignmentId: futureAssignmentId,
                permissionId: futurePermissionId,
                effectiveFrom: futureFrom,
                expiresAt: futureExpiry,
            },
        ]) {
            await database.collection("access_permission_assignments").insertOne({
                assignmentId: assignment.assignmentId,
                identityId: targetIdentity.userId,
                membershipId,
                tenantId: administrator.tenantId,
                permissionId: assignment.permissionId,
                assignmentType: "grant",
                scope: { scopeType: "tenant" },
                status: "active",
                assignedBy: administrator.identity.userId,
                effectiveFrom: assignment.effectiveFrom,
                expiresAt: assignment.expiresAt,
                suspensionSources: [],
                createdAt: assignment.effectiveFrom,
                updatedAt: assignment.effectiveFrom,
            });
        }

        await database.collection("access_restrictions").insertOne({
            restrictionId,
            tenantId: administrator.tenantId,
            target: {
                targetType: "permission",
                permissionId: restrictedPermissionId,
            },
            restrictionReason: "R2 release certification restriction",
            status: "active",
            effectiveFrom,
            expiresAt,
            createdBy: administrator.identity.userId,
            createdAt: effectiveFrom,
            updatedAt: effectiveFrom,
        });

        const effectiveAccess = await accessHttp(
            administrator.sessionId,
            "GET",
            `/effective-access/${encodeURIComponent(membershipId)}`,
        );

        expect(effectiveAccess.statusCode).toBe(200);
        const effectiveBody = effectiveAccess.json();

        expect(effectiveBody).toMatchObject({
            identityId: targetIdentity.userId,
            membershipId,
            tenantId: administrator.tenantId,
            membershipIsValid: true,
            effectivePermissions: expect.arrayContaining([
                expect.objectContaining({
                    permission: expect.objectContaining({ permissionId: rolePermissionId }),
                    source: "role_assignment",
                    sourceId: roleAssignmentId,
                    effectiveFrom,
                    expiresAt,
                }),
                expect.objectContaining({
                    permission: expect.objectContaining({ permissionId: privilegedPermissionId }),
                    source: "role_assignment",
                    sourceId: roleAssignmentId,
                }),
                expect.objectContaining({
                    permission: expect.objectContaining({ permissionId: restrictedPermissionId }),
                    source: "permission_assignment",
                    sourceId: directAssignmentId,
                    effectiveFrom,
                    expiresAt,
                }),
            ]),
            restrictions: expect.arrayContaining([
                expect.objectContaining({
                    restrictionId,
                    target: expect.objectContaining({
                        targetType: "permission",
                        permissionId: restrictedPermissionId,
                    }),
                }),
            ]),
            evaluatedAt: expect.any(String),
        });

        const effectivePermissionIds = effectiveBody.effectivePermissions.map(
            (entry: { permission: { permissionId: string } }) => entry.permission.permissionId,
        );
        expect(effectivePermissionIds).not.toContain(expiredPermissionId);
        expect(effectivePermissionIds).not.toContain(futurePermissionId);

        const [allowService, allowResource, allowAction] = rolePermissionId.split(".") as [string, string, string];
        const allowExplanation = await accessHttp(
            administrator.sessionId,
            "POST",
            `/access-explanations/${encodeURIComponent(membershipId)}`,
            {
                action: `${allowService}.${allowResource}.${allowAction}`,
                resource: { type: allowResource },
            },
        );

        expect(allowExplanation.statusCode).toBe(200);
        expect(allowExplanation.json()).toMatchObject({
            identityId: targetIdentity.userId,
            membershipId,
            tenantId: administrator.tenantId,
            decision: "allow",
            reasonCode: "permission_granted",
            evidence: expect.arrayContaining([
                expect.objectContaining({
                    source: "role_assignment",
                    sourceId: roleAssignmentId,
                }),
            ]),
        });

        const [denyService, denyResource, denyAction] = restrictedPermissionId.split(".") as [string, string, string];
        const denyExplanation = await accessHttp(
            administrator.sessionId,
            "POST",
            `/access-explanations/${encodeURIComponent(membershipId)}`,
            {
                action: `${denyService}.${denyResource}.${denyAction}`,
                resource: { type: denyResource },
            },
        );

        expect(denyExplanation.statusCode).toBe(200);
        expect(denyExplanation.json()).toMatchObject({
            identityId: targetIdentity.userId,
            membershipId,
            tenantId: administrator.tenantId,
            decision: "deny",
            reasonCode: "access_restricted",
            evidence: expect.arrayContaining([
                expect.objectContaining({
                    source: "access_restriction",
                    sourceId: restrictionId,
                }),
            ]),
        });

        const summary = await accessHttp(
            administrator.sessionId,
            "GET",
            `/access-summary/${encodeURIComponent(membershipId)}`,
        );

        expect(summary.statusCode).toBe(200);
        expect(summary.json()).toMatchObject({
            identityId: targetIdentity.userId,
            membershipId,
            tenantId: administrator.tenantId,
            membershipIsValid: true,
            effectivePermissionCount: 3,
            roleAssignmentCount: 1,
            directPermissionAssignmentCount: 1,
            restrictionCount: 1,
            expiringAccessCount: 2,
            privilegedPermissionCount: 1,
            hasPrivilegedAccess: true,
            evaluatedAt: expect.any(String),
        });

        const impact = await accessHttp(
            administrator.sessionId,
            "GET",
            `/access-impact/roles/${encodeURIComponent(roleId)}`,
        );

        expect(impact.statusCode).toBe(200);
        expect(impact.json()).toMatchObject({
            tenantId: administrator.tenantId,
            roleId,
            privilegedRole: true,
            affectedMembershipIds: [membershipId],
            affectedAssignmentIds: [roleAssignmentId],
            affectedPermissionIds: expect.arrayContaining([
                rolePermissionId,
                privilegedPermissionId,
            ]),
            privilegedPermissionIds: [privilegedPermissionId],
            affectedMemberCount: 1,
            affectedAssignmentCount: 1,
            affectedPermissionCount: 2,
            evaluatedAt: expect.any(String),
        });
    });

    it("denies cross-tenant R2 administration intelligence", async () => {
        const administrator = await createAccessAdministrativeContext();
        const foreign = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const now = new Date().toISOString();
        const foreignRoleId = `role_${randomUUID()}`;

        await runtime.database.database.collection("access_roles").insertOne({
            roleId: foreignRoleId,
            roleKey: `r2-foreign-${randomUUID()}`,
            roleName: "Foreign R2 Role",
            description: "Cross-tenant R2 release gate role.",
            roleType: "tenant",
            tenantId: foreign.tenantId,
            lifecycleStatus: "active",
            permissionIds: [],
            createdBy: foreign.identity.userId,
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
        });

        const effectiveAccess = await accessHttp(
            administrator.sessionId,
            "GET",
            `/effective-access/${encodeURIComponent(foreign.membershipId)}`,
        );
        expect(effectiveAccess.statusCode).toBe(403);

        const summary = await accessHttp(
            administrator.sessionId,
            "GET",
            `/access-summary/${encodeURIComponent(foreign.membershipId)}`,
        );
        expect(summary.statusCode).toBe(403);

        const explanation = await accessHttp(
            administrator.sessionId,
            "POST",
            `/access-explanations/${encodeURIComponent(foreign.membershipId)}`,
            {
                action: "access.role.view",
                resource: { type: "role" },
            },
        );
        expect(explanation.statusCode).toBe(403);

        const impact = await accessHttp(
            administrator.sessionId,
            "GET",
            `/access-impact/roles/${encodeURIComponent(foreignRoleId)}`,
        );
        expect(impact.statusCode).toBe(403);
    });
});

async function waitForKnownIdentityStatus(
    runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>,
    identityId: string,
    status: string,
): Promise<void> {
    const identity = await waitForIamCondition(
        async () => {
            const candidate = await runtime.database.database
                .collection("access_known_identities")
                .findOne({ identityId });

            return candidate?.status === status
                ? candidate
                : undefined;
        },
        undefined,
        `Access known Identity ${identityId} to become ${status}`,
    );

    expect(identity).toMatchObject({ identityId, status });
}

async function waitForKnownMembershipStatus(
    runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>,
    membershipId: string,
    status: string,
): Promise<void> {
    const membership = await waitForIamCondition(
        async () => {
            const candidate = await runtime.database.database
                .collection("access_known_memberships")
                .findOne({ membershipId });

            return candidate?.status === status
                ? candidate
                : undefined;
        },
        undefined,
        `Access known Membership ${membershipId} to become ${status}`,
    );

    expect(membership).toMatchObject({ membershipId, status });
}
