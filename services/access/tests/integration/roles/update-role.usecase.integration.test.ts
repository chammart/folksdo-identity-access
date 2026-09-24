import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Update Role™ use case", () => {
    it("updates mutable Role state atomically", async () => {
        const role = await createAccessRole();
        const { runtime, useCases } = await getAccessUseCases();
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        await useCases.roles.update.execute({ roleId: role.roleId, name: "Updated Certification Role", updatedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_roles").findOne({ roleId: role.roleId })).resolves.toMatchObject({ name: "Updated Certification Role" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.updated" });
    });
});
