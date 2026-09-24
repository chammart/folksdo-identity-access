import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Archive Role™ use case", () => {
    it("archives Role state atomically", async () => {
        const role = await createAccessRole();
        const { runtime, useCases } = await getAccessUseCases();
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        await useCases.roles.archive.execute({ roleId: role.roleId, archivedBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_roles").findOne({ roleId: role.roleId })).resolves.toMatchObject({ lifecycleStatus: "archived" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.archived" });
    });
});
