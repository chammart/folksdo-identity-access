import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessPolicy, getAccessUseCases } from "../access-integration-fixtures";

describe("Update Authorization Policy™ use case", () => {
    it("versions canonical Policy state atomically", async () => {
        const membership = await createAccessKnownMembership();
        const policy = await createAccessPolicy({ tenantId: membership.tenantId });
        const { runtime, useCases } = await getAccessUseCases();

        const updated = await useCases.policies.update.execute({
            policyId: policy.policyId,
            name: "Updated Certification Policy",
            evaluationRules: {
                requireActiveIdentity: true,
                requireActiveMembership: true,
                denyOnRestriction: true,
            },
            updatedBy: "system:access-integration",
        });

        expect(updated).toMatchObject({
            policyId: policy.policyId,
            name: "Updated Certification Policy",
            version: 2,
            lifecycleStatus: "draft",
        });

        await expect(runtime.database.database.collection("access_authorization_policies").findOne({
            policyId: policy.policyId,
        })).resolves.toMatchObject({
            name: "Updated Certification Policy",
            version: 2,
            lifecycleStatus: "draft",
        });

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "access.policy.updated",
        });
    });
});
