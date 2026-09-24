import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPolicy, getAccessUseCases } from "../access-integration-fixtures";

describe("Archive Authorization Policy™ use case", () => {
    it("archives canonical Policy state atomically", async () => {
        const membership = await createAccessKnownMembership();
        const policy = await createAccessPolicy({ tenantId: membership.tenantId });
        const { runtime, useCases } = await getAccessUseCases();

        const archived = await useCases.policies.archive.execute({
            policyId: policy.policyId,
            archivedBy: "system:access-integration",
        });

        expect(archived).toMatchObject({
            policyId: policy.policyId,
            lifecycleStatus: "archived",
        });

        await expect(runtime.database.database.collection("access_authorization_policies").findOne({
            policyId: policy.policyId,
        })).resolves.toMatchObject({
            lifecycleStatus: "archived",
        });

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "access.policy.archived",
        });
    });
});
