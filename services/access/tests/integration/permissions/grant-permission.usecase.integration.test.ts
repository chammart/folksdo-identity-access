import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPermission, getAccessUseCases } from "../access-integration-fixtures";

describe("Grant Permission™ use case", () => {
    it("commits an active direct Permission grant for an eligible Membership", async () => {
        const membership = await createAccessKnownMembership();
        const permission = await createAccessPermission();
        const { runtime, useCases } = await getAccessUseCases();
        const assignment = await useCases.permissions.grant.execute({ membershipId: membership.membershipId, tenantId: membership.tenantId, permissionId: permission.permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, assignedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_permission_assignments").findOne({ assignmentId: assignment.assignmentId })).resolves.toMatchObject({ membershipId: membership.membershipId, status: "active", assignmentType: "grant" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.permission.granted" });
    });
});
