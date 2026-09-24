import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, getAccessUseCases } from "../access-integration-fixtures";

describe("Expire Restriction™ use case", () => {
    it("rejects premature expiration and atomically expires an elapsed restriction", async () => {
        const membership = await createAccessKnownMembership();
        const { runtime, useCases } = await getAccessUseCases();
        const restriction = await useCases.restrictions.create.execute({
            target: { targetType: "membership", membershipId: membership.membershipId },
            tenantId: membership.tenantId,
            restrictionReason: "Access expiration certification",
            createdBy: "system:access-integration",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });

        await expect(useCases.expirations.restriction.execute({
            restrictionId: restriction.restrictionId,
        })).rejects.toThrow();
        await expect(runtime.database.database.collection("access_restrictions").findOne({
            restrictionId: restriction.restrictionId,
        })).resolves.toMatchObject({ status: "active" });

        const elapsed = new Date(Date.now() - 60_000).toISOString();
        await runtime.database.database.collection("access_restrictions").updateOne(
            { restrictionId: restriction.restrictionId },
            { $set: { expiresAt: elapsed } },
        );
        await runtime.database.database.collection("engine_outbox").deleteMany({});

        const expired = await useCases.expirations.restriction.execute({
            restrictionId: restriction.restrictionId,
        });
        expect(expired).toMatchObject({
            restrictionId: restriction.restrictionId, status: "expired", expiresAt: elapsed, expiredAt: expect.any(String),
        });
        await expect(runtime.database.database.collection("access_restrictions").findOne({
            restrictionId: restriction.restrictionId,
        })).resolves.toMatchObject({ status: "expired", expiresAt: elapsed, expiredAt: expect.any(String) });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.restriction.expired" });
        await expect(useCases.expirations.restriction.execute({
            restrictionId: restriction.restrictionId,
        })).rejects.toThrow();
    });
});
