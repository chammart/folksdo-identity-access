import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessRestriction, getAccessUseCases } from "../access-integration-fixtures";

describe("Remove Restriction™ use case", () => {
    it("removes a Restriction while preserving canonical historical state", async () => {
        const membership = await createAccessKnownMembership();
        const restriction = await createAccessRestriction({
            tenantId: membership.tenantId,
            membershipId: membership.membershipId,
        });
        const { runtime, useCases } = await getAccessUseCases();

        const removed = await useCases.restrictions.remove.execute({
            restrictionId: restriction.restrictionId,
            removedBy: "system:access-integration",
        });

        expect(removed).toMatchObject({
            restrictionId: restriction.restrictionId,
            status: "removed",
            removedBy: "system:access-integration",
            removedAt: expect.any(String),
        });

        await expect(runtime.database.database.collection("access_restrictions").findOne({
            restrictionId: restriction.restrictionId,
        })).resolves.toMatchObject({
            restrictionId: restriction.restrictionId,
            status: "removed",
            removedBy: "system:access-integration",
            removedAt: expect.any(String),
        });

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "access.restriction.removed",
        });
    });
});
