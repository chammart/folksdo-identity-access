import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPermission, createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Create Role™ use case", () => {
    it("commits a tenant Role with canonical Permission composition", async () => {
        const membership = await createAccessKnownMembership();
        const permission = await createAccessPermission();
        const role = await createAccessRole({ tenantId: membership.tenantId, permissionIds: [permission.permissionId] });
        const { runtime } = await getAccessUseCases();
        await expect(runtime.database.database.collection("access_roles").findOne({ roleId: role.roleId })).resolves.toMatchObject({ tenantId: membership.tenantId, permissionIds: [permission.permissionId], lifecycleStatus: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.created" });
    });
});
