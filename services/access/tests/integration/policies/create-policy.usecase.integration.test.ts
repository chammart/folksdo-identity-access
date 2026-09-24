import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPolicy, getAccessUseCases } from "../access-integration-fixtures";

describe("Create Authorization Policy™ use case", () => {
    it("commits canonical tenant Policy state, event, and outbox", async () => {
        const membership = await createAccessKnownMembership();
        const policy = await createAccessPolicy({ tenantId: membership.tenantId });
        const { runtime } = await getAccessUseCases();

        await expect(runtime.database.database.collection("access_authorization_policies").findOne({
            policyId: policy.policyId,
        })).resolves.toMatchObject({
            policyId: policy.policyId,
            tenantId: membership.tenantId,
            scope: "tenant",
            version: 1,
            lifecycleStatus: "draft",
        });

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "access.policy.created",
        });
    });
});
