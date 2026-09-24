import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Remove Role™ use case", () => {
    it("removes an active Role assignment atomically", async () => {
        const membership = await createAccessKnownMembership();
        const role = await createAccessRole({ tenantId: membership.tenantId });
        const { runtime, useCases } = await getAccessUseCases();
        const assignment = await useCases.roles.assign.execute({ roleId: role.roleId, membershipId: membership.membershipId, tenantId: membership.tenantId, assignedBy: "system:access-integration" });
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        await useCases.roles.remove.execute({ assignmentId: assignment.assignmentId, removedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_role_assignments").findOne({ assignmentId: assignment.assignmentId })).resolves.toMatchObject({ status: "removed" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.removed" });
    });
});
