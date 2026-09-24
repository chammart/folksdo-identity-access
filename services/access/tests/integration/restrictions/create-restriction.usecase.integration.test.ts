import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessRestriction, getAccessUseCases } from "../access-integration-fixtures";

describe("Create Restriction™ use case", () => {
    it("commits canonical Restriction state, event, and outbox", async () => {
        const membership = await createAccessKnownMembership();
        const restriction = await createAccessRestriction({
            tenantId: membership.tenantId,
            membershipId: membership.membershipId,
        });
        const { runtime } = await getAccessUseCases();

        expect(restriction).toMatchObject({
            tenantId: membership.tenantId,
            target: {
                targetType: "membership",
                membershipId: membership.membershipId,
            },
            status: "active",
            restrictionReason: "Access integration certification restriction.",
        });

        await expect(runtime.database.database.collection("access_restrictions").findOne({
            restrictionId: restriction.restrictionId,
        })).resolves.toMatchObject({
            restrictionId: restriction.restrictionId,
            tenantId: membership.tenantId,
            target: {
                targetType: "membership",
                membershipId: membership.membershipId,
            },
            status: "active",
        });

        await expectIamOutboxCommitted({
            database: runtime.database,
            subject: "access.restriction.created",
        });
    });
});
