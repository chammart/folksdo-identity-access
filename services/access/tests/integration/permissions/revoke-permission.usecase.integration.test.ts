import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPermission, getAccessUseCases } from "../access-integration-fixtures";

describe("Revoke Permission™ use case", () => {
    it("revokes a direct Permission assignment atomically", async () => {
        const membership = await createAccessKnownMembership();
        const permission = await createAccessPermission();
        const { runtime, useCases } = await getAccessUseCases();
        const assignment = await useCases.permissions.grant.execute({ membershipId: membership.membershipId, tenantId: membership.tenantId, permissionId: permission.permissionId, assignmentType: "grant", scope: { scopeType: "tenant" }, assignedBy: "system:access-integration" });
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        await useCases.permissions.revoke.execute({ assignmentId: assignment.assignmentId, revokedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_permission_assignments").findOne({ assignmentId: assignment.assignmentId })).resolves.toMatchObject({ status: "revoked" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.permission.revoked" });
    });
});
