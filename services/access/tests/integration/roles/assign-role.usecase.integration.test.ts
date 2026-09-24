import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Assign Role™ use case", () => {
    it("assigns a tenant Role to an eligible Membership atomically", async () => {
        const membership = await createAccessKnownMembership();
        const role = await createAccessRole({ tenantId: membership.tenantId });
        const { runtime, useCases } = await getAccessUseCases();
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        const assignment = await useCases.roles.assign.execute({ roleId: role.roleId, membershipId: membership.membershipId, tenantId: membership.tenantId, assignedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_role_assignments").findOne({ assignmentId: assignment.assignmentId })).resolves.toMatchObject({ membershipId: membership.membershipId, roleId: role.roleId, status: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.assigned" });
    });
});
