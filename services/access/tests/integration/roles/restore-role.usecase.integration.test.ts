import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessRole, getAccessUseCases } from "../access-integration-fixtures";

describe("Restore Role™ use case", () => {
    it("restores an archived Role atomically", async () => {
        const role = await createAccessRole();
        const { runtime, useCases } = await getAccessUseCases();
        await useCases.roles.archive.execute({ roleId: role.roleId, archivedBy: "system:access-integration" });
        await runtime.database.database.collection("engine_outbox").deleteMany({});
        await useCases.roles.restore.execute({ roleId: role.roleId, restoredBy: "system:access-integration" });
        await expect(runtime.database.database.collection("access_roles").findOne({ roleId: role.roleId })).resolves.toMatchObject({ lifecycleStatus: "active" });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.role.restored" });
    });
});
