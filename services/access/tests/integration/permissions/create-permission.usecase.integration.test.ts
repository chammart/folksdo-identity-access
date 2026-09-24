// services/access/tests/integration/permissions/create-permission.usecase.integration.test.ts
import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessPermission, getAccessUseCases } from "../access-integration-fixtures";

describe("Create Permission™ use case", () => {
    it("commits canonical Permission state, event, and outbox", async () => {
        const permission = await createAccessPermission();
        const { runtime } = await getAccessUseCases();
        await expect(runtime.database.database.collection("access_permissions").findOne({ permissionId: permission.permissionId })).resolves.toMatchObject({ permissionId: permission.permissionId, classification: "tenant" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.permission.created" });
    });
});
