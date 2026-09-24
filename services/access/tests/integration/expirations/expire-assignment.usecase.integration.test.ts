import { describe, expect, it } from "@jest/globals";
import { expectIamOutboxCommitted } from "../../../../../tests/integration/support/iam-outbox-assertions";
import { createAccessKnownMembership, createAccessRole, getAccessUseCases } from "../access-integration-fixtures";


describe("Expire Role Assignment™ use case", () => {
    it("rejects premature expiration and atomically expires an elapsed assignment", async () => {
        const membership = await createAccessKnownMembership();
        const role = await createAccessRole({ tenantId: membership.tenantId });
        const { runtime, useCases } = await getAccessUseCases();
        const assignment = await useCases.roles.assign.execute({
            roleId: role.roleId,
            membershipId: membership.membershipId,
            tenantId: membership.tenantId,
            assignedBy: "system:access-integration",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });

        await expect(useCases.expirations.assignment.execute({
            assignmentType: "role",
            assignmentId: assignment.assignmentId,
        })).rejects.toThrow();

        await expect(runtime.database.database.collection("access_role_assignments").findOne({
            assignmentId: assignment.assignmentId,
        })).resolves.toMatchObject({ status: "active" });

        // The real worker uses the same canonical assignment state and expiration use case.
        // Advance only the persisted expiration boundary; do not mock the runtime clock.
        const elapsed = new Date(Date.now() - 60_000).toISOString();
        await runtime.database.database.collection("access_role_assignments").updateOne(
            { assignmentId: assignment.assignmentId },
            { $set: { expiresAt: elapsed } },
        );
        await runtime.database.database.collection("engine_outbox").deleteMany({});

        const result = await useCases.expirations.assignment.execute({
            assignmentType: "role",
            assignmentId: assignment.assignmentId,
        });
        expect(result).toMatchObject({
            assignmentType: "role",
            assignment: { assignmentId: assignment.assignmentId, status: "expired", expiresAt: elapsed, expiredAt: expect.any(String) },
        });
        await expect(runtime.database.database.collection("access_role_assignments").findOne({
            assignmentId: assignment.assignmentId,
        })).resolves.toMatchObject({ status: "expired", expiresAt: elapsed, expiredAt: expect.any(String) });
        await expectIamOutboxCommitted({ database: runtime.database, subject: "access.assignment.expired" });
        await expect(useCases.expirations.assignment.execute({
            assignmentType: "role", assignmentId: assignment.assignmentId,
        })).rejects.toThrow();
    });
});
