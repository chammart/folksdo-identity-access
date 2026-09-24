// tests/e2e/foundation/iam-cross-capability-security.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM CROSS-CAPABILITY SECURITY E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Certifies the real Identity → Membership → Access enforcement chain through
// public HTTP, real Engine commits, outbox delivery, NATS reactions, and Access
// authorization state.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../../integration/support/iam-integration-runtime";
import { waitForIamCondition } from "../../integration/support/iam-outbox-assertions";
import {
    createActiveIdentity,
    signInIdentity,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";
import {
    membershipPost,
} from "../../../services/membership/tests/integration/membership-integration-fixtures";
import {
    accessHttp,
    createAccessAdministrativeContext,
} from "../access/support/access-authenticated-fixtures";

describe("IAM cross-capability security enforcement", () => {
    it("enforces Membership suspension and reactivation in Access, then preserves Permission revocation", async () => {
        const administrator = await createAccessAdministrativeContext();
        const runtime = await getIamIntegrationRuntime();
        const memberIdentity = await createActiveIdentity();
        const memberSessionId = await signInIdentity(memberIdentity);

        const createMembership = await membershipPost(
            runtime,
            "/api/v1/membership",
            {
                identityId: memberIdentity.userId,
                tenantId: administrator.tenantId,
                membershipType: "member",
                activate: true,
            },
            administrator.sessionId,
        );

        expect(createMembership.statusCode).toBe(201);

        const memberMembershipId = String(
            createMembership.json().membershipId,
        );

        await waitForKnownMembershipStatus(
            runtime,
            memberMembershipId,
            "active",
        );

        // Identity activation and Membership activation reach Access through
        // independent reaction streams. Authorization requires both known facts.
        await waitForKnownIdentityStatus(
            runtime,
            memberIdentity.userId,
            "active",
        );

        const switchContext = await membershipPost(
            runtime,
            "/api/v1/membership/context",
            {
                membershipId: memberMembershipId,
            },
            memberSessionId,
        );

        expect(switchContext.statusCode).toBe(200);

        const suffix = randomUUID().replaceAll("-", "");
        const permissionId = `permission_certification_cross_capability_${suffix}`;
        const now = new Date().toISOString();

        await runtime.database.database.collection("access_permissions").insertOne({
            permissionId,
            service: "certification",
            resource: "cross_capability",
            action: "read",
            displayName: "Cross-capability certification read",
            description: "Certifies Membership lifecycle enforcement in Access.",
            classification: "administrative",
            createdAt: now,
        });

        // Delegation is itself authorization-controlled. The administrator must
        // hold the Permission before granting it to another Membership.
        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId: administrator.identity.userId,
            membershipId: administrator.membershipId,
            tenantId: administrator.tenantId,
            permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:iam-cross-capability-e2e",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });

        const grant = await accessHttp(
            administrator.sessionId,
            "POST",
            "/permission-assignments",
            {
                permissionId,
                subjectType: "membership",
                subjectId: memberMembershipId,
                identityId: memberIdentity.userId,
                membershipId: memberMembershipId,
                tenantId: administrator.tenantId,
                effect: "grant",
                scope: "tenant",
            },
        );

        expect(grant.statusCode).toBe(201);

        const assignmentId = String(
            grant.json().assignmentId,
        );

        await waitForAssignmentStatus(
            runtime,
            assignmentId,
            "active",
        );

        await expectAuthorization(
            memberSessionId,
            true,
            "permission_granted",
        );

        const suspend = await membershipPost(
            runtime,
            `/api/v1/membership/${memberMembershipId}/suspend`,
            { reason: "IAM cross-capability certification" },
            administrator.sessionId,
        );

        expect(suspend.statusCode).toBe(200);

        await waitForKnownMembershipStatus(
            runtime,
            memberMembershipId,
            "suspended",
        );

        await waitForAssignmentStatus(
            runtime,
            assignmentId,
            "suspended",
        );

        await expectAuthorization(
            memberSessionId,
            false,
        );

        const reactivate = await membershipPost(
            runtime,
            `/api/v1/membership/${memberMembershipId}/reactivate`,
            {},
            administrator.sessionId,
        );

        expect(reactivate.statusCode).toBe(200);

        await waitForKnownMembershipStatus(
            runtime,
            memberMembershipId,
            "active",
        );

        await waitForAssignmentStatus(
            runtime,
            assignmentId,
            "active",
        );

        // Suspension invalidates the selected tenant execution context.
        // Reactivation restores Membership and Access authorization state, but
        // the Identity must explicitly establish its Membership Context again.
        const restoreContext = await membershipPost(
            runtime,
            "/api/v1/membership/context",
            {
                membershipId: memberMembershipId,
            },
            memberSessionId,
        );

        expect(restoreContext.statusCode).toBe(200);

        await expectAuthorization(
            memberSessionId,
            true,
            "permission_granted",
        );

        const revoke = await accessHttp(
            administrator.sessionId,
            "POST",
            `/permission-assignments/${assignmentId}/revoke`,
            { reason: "IAM cross-capability certification complete" },
        );

        expect(revoke.statusCode).toBe(200);

        await waitForAssignmentStatus(
            runtime,
            assignmentId,
            "revoked",
        );

        await expectAuthorization(
            memberSessionId,
            false,
        );
    });
});

async function expectAuthorization(
    sessionId: string,
    allowed: boolean,
    reasonCode?: string,
): Promise<void> {
    const response = await accessHttp(
        sessionId,
        "POST",
        "/authorize",
        {
            action: "certification.cross_capability.read",
            resource: {
                type: "cross_capability",
            },
        },
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
        allowed,
        ...(reasonCode === undefined ? {} : { reasonCode }),
    });
}

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

    expect(identity).toMatchObject({
        identityId,
        status,
    });
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

    expect(membership).toMatchObject({
        membershipId,
        status,
    });
}

async function waitForAssignmentStatus(
    runtime: Awaited<ReturnType<typeof getIamIntegrationRuntime>>,
    assignmentId: string,
    status: string,
): Promise<void> {
    const assignment = await waitForIamCondition(
        async () => {
            const candidate = await runtime.database.database
                .collection("access_permission_assignments")
                .findOne({ assignmentId });

            return candidate?.status === status
                ? candidate
                : undefined;
        },
        undefined,
        `Permission Assignment ${assignmentId} to become ${status}`,
    );

    expect(assignment).toMatchObject({
        assignmentId,
        status,
    });
}
