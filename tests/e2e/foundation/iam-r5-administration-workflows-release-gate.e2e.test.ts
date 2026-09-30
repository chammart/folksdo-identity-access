// tests/e2e/foundation/iam-r5-administration-workflows-release-gate.e2e.test.ts
// -----------------------------------------------------------------------------
// R5 RELEASE GATE — ADMINISTRATION WORKFLOWS & GOVERNANCE
// -----------------------------------------------------------------------------
// Real HTTP + Engine + MongoDB + NATS. No HTTP mocks.
// Certifies Membership-owned invitation lifecycle and Access-owned governance.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { createCertifiedMembership } from "../../../services/membership/tests/integration/membership-integration-fixtures";
import { waitForIamCondition } from "../../integration/support/iam-outbox-assertions";
import { createAccessAdministrativeContext, accessHttp } from "../access/support/access-authenticated-fixtures";

const PASSWORD = "R5!CertificationPassword123";

describe("R5 Administration Workflows & Governance release gate", () => {
    it("certifies invitation administration through activation and Access application", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();

        const sourceRole = await accessHttp(admin.sessionId, "POST", "/roles", {
            key: `r5-source-${randomUUID()}`,
            name: "R5 Initial Access",
            description: "R5 release gate initial role.",
            type: "tenant",
            tenantId: admin.tenantId,
            permissionIds: [],
        });
        expect(sourceRole.statusCode).toBe(201);
        const roleId = String(sourceRole.json().roleId);

        const email = `r5-gate-${randomUUID()}@example.com`;
        const invite = await post(admin.sessionId, "/api/v1/membership/invitations", {
            tenantId: admin.tenantId,
            invitedEmail: email,
            membershipType: "member",
            initialRoleId: roleId,
        });
        expect(invite.statusCode).toBe(201);
        const invitation = invite.json();
        expect(invitation.initialRoleId).toBe(roleId);
        expect(invitation.invitationToken).toEqual(expect.any(String));

        // Wait for the real Membership → Identity invitation projection before
        // exercising Identity's public acceptance route.
        await waitForIamCondition(async () => {
            const known = await runtime.database.database.collection("identity_known_invitations").findOne({
                invitationId: invitation.invitationId,
            });
            return known !== null ? known : undefined;
        });

        // Identity accepts the Membership-owned invitation through the public API.
        const signup = await runtime.server.app.inject({
            method: "POST",
            url: "/api/v1/identity/invitation-sign-up",
            headers: { "content-type": "application/json" },
            payload: {
                invitationToken: invitation.invitationToken,
                email,
                password: PASSWORD,
                displayName: "R5 Release Gate",
                locale: "en-CA",
                timezone: "America/Toronto",
            },
        });
        expect(signup.statusCode).toBe(201);
        const userId = String(signup.json().userId);

        const membership = await waitForIamCondition(async () =>
            runtime.database.database.collection("membership_memberships").findOne({
                identityId: userId,
                tenantId: admin.tenantId,
            }),
        );
        expect(membership).toMatchObject({
            identityId: userId,
            tenantId: admin.tenantId,
            sourceInvitationId: invitation.invitationId,
            initialRoleId: roleId,
        });

        const verification = await runtime.database.database.collection("identity_email_verifications").findOne({ userId });
        const capture = await runtime.database.database.collection("identity_acceptance_captures").findOne({
            kind: "email_verification",
            email,
        });
        expect(verification?.verificationId).toEqual(expect.any(String));
        expect(capture?.token).toEqual(expect.any(String));

        const verified = await runtime.server.app.inject({
            method: "POST",
            url: "/api/v1/identity/verify-email",
            headers: { "content-type": "application/json" },
            payload: {
                verificationId: verification?.verificationId,
                verificationToken: capture?.token,
            },
        });
        expect(verified.statusCode).toBe(200);

        await waitForIamCondition(async () => {
            const state = await runtime.database.database.collection("membership_memberships").findOne({
                identityId: userId,
                tenantId: admin.tenantId,
            });
            return state?.status === "active" ? state : undefined;
        });

        const accessAssignment = await waitForIamCondition(async () =>
            runtime.database.database.collection("access_role_assignments").findOne({
                membershipId: membership.membershipId,
                tenantId: admin.tenantId,
                roleId,
                status: { $in: ["pending", "active"] },
            }),
        );
        expect(accessAssignment).toMatchObject({
            membershipId: membership.membershipId,
            tenantId: admin.tenantId,
            roleId,
        });

        // Retry safety: one canonical assignment only.
        expect(await runtime.database.database.collection("access_role_assignments").countDocuments({
            membershipId: membership.membershipId,
            tenantId: admin.tenantId,
            roleId,
            status: { $in: ["pending", "active"] },
        })).toBe(1);

        const activationEvent = await runtime.database.database.collection("engine_events").findOne({
            aggregateId: membership.membershipId,
            eventType: "membership.membership.activated",
        });
        expect(activationEvent?.payload).toMatchObject({
            membershipId: membership.membershipId,
            initialRoleId: roleId,
        });

        assertSafe(signup.body);
        assertSafe(verified.body);

        async function post(sessionId: string, url: string, payload: Record<string, unknown>) {
            return runtime.server.app.inject({
                method: "POST",
                url,
                headers: {
                    authorization: `Bearer ${sessionId}`,
                    "content-type": "application/json",
                },
                payload,
            });
        }
    });

    it("certifies role clone, bulk role workflows and direct-access governance", async () => {
        const admin = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();

        const source = await accessHttp(admin.sessionId, "POST", "/roles", {
            key: `r5-clone-source-${randomUUID()}`,
            name: "R5 Clone Source",
            description: "Source role",
            type: "tenant",
            tenantId: admin.tenantId,
            permissionIds: [],
        });
        expect(source.statusCode).toBe(201);
        const sourceRoleId = String(source.json().roleId);

        const clone = await accessHttp(admin.sessionId, "POST", `/roles/${sourceRoleId}/clone`, {
            key: `r5-clone-${randomUUID()}`,
            name: "R5 Clone",
        });
        expect(clone.statusCode).toBe(201);
        expect(clone.json()).toMatchObject({
            tenantId: admin.tenantId,
            permissionIds: source.json().permissionIds,
        });
        expect(clone.json().roleId).not.toBe(sourceRoleId);

        const bulk = await accessHttp(admin.sessionId, "POST", "/role-assignments/bulk", {
            items: [{
                roleId: clone.json().roleId,
                subjectType: "membership",
                subjectId: admin.membershipId,
                identityId: admin.identity.userId,
                membershipId: admin.membershipId,
                tenantId: admin.tenantId,
            }],
        });
        expect(bulk.statusCode).toBe(200);
        expect(bulk.json().items[0]).toMatchObject({ index: 0, outcome: "assigned" });
        const assignmentId = String(bulk.json().items[0].assignment.assignmentId);

        const retry = await accessHttp(admin.sessionId, "POST", "/role-assignments/bulk", {
            items: [{
                roleId: clone.json().roleId,
                subjectType: "membership",
                subjectId: admin.membershipId,
                identityId: admin.identity.userId,
                membershipId: admin.membershipId,
                tenantId: admin.tenantId,
            }],
        });
        expect(retry.statusCode).toBe(200);
        expect(retry.json().items[0].outcome).toBe("existing");

        const removed = await accessHttp(admin.sessionId, "POST", "/role-assignments/bulk-remove", {
            items: [{ assignmentId, reason: "R5 release gate cleanup" }],
        });
        expect(removed.statusCode).toBe(200);
        expect(removed.json().items[0]).toMatchObject({ index: 0, outcome: "removed" });

        // Governance metadata remains canonical Access state. Use a dedicated
        // tenant permission so this assertion cannot collide with the
        // administrative grants seeded only to authorize the certification actor.
        const permissionId = `permission_r5_governance_${randomUUID()}`;
        const now = new Date().toISOString();
        await runtime.database.database.collection("access_permissions").insertOne({
            permissionId,
            service: "r5-certification",
            resource: "governance-exception",
            action: "exercise",
            displayName: "R5 Governance Exception",
            description: "Dedicated direct-access permission for the R5 release gate.",
            classification: "administrative",
            createdAt: now,
        });

        // Delegated-access enforcement is part of the hardened Access contract.
        // Seed the certification actor's prerequisite authority as fixture state;
        // the direct assignment under test is still created through real HTTP.
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_r5_delegate_${randomUUID()}`,
            identityId: admin.identity.userId,
            membershipId: admin.membershipId,
            tenantId: admin.tenantId,
            permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:r5-release-gate-prerequisite",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });

        const targetMembership = await createCertifiedMembership(admin, true);
        const targetMembershipId = String(targetMembership.membershipId);
        const targetIdentityId = String(targetMembership.identityId);

        await waitForIamCondition(async () => {
            const known = await runtime.database.database.collection("access_known_memberships").findOne({
                membershipId: targetMembershipId,
                tenantId: admin.tenantId,
            });
            return known !== null ? known : undefined;
        });

        const reviewAt = new Date(Date.now() - 60_000).toISOString();
        const direct = await accessHttp(admin.sessionId, "POST", "/permission-assignments", {
            permissionId,
            subjectType: "membership",
            subjectId: targetMembershipId,
            identityId: targetIdentityId,
            membershipId: targetMembershipId,
            tenantId: admin.tenantId,
            effect: "grant",
            scope: "tenant",
            justification: "Temporary R5 operational exception",
            reviewAt,
        });
        expect(direct.statusCode).toBe(201);
        expect(direct.json()).toMatchObject({
            justification: "Temporary R5 operational exception",
            reviewAt,
        });

        const persisted = await runtime.database.database.collection("access_permission_assignments").findOne({
            assignmentId: direct.json().assignmentId,
        });
        expect(persisted).toMatchObject({
            justification: "Temporary R5 operational exception",
            reviewAt,
        });

        const exceptions = await accessHttp(admin.sessionId, "GET", "/direct-access/exceptions");
        expect(exceptions.statusCode).toBe(200);
        expect(exceptions.json().items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                assignmentId: direct.json().assignmentId,
                governance: expect.objectContaining({ reviewStatus: "due" }),
            }),
        ]));

        assertSafe(clone.body);
        assertSafe(bulk.body);
        assertSafe(exceptions.body);
    });
});

function assertSafe(body: string): void {
    expect(body).not.toContain("invitationTokenHash");
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("passwordCredentialId");
    expect(body).not.toContain("providerSessionId");
    expect(body).not.toContain('"secret"');
}
