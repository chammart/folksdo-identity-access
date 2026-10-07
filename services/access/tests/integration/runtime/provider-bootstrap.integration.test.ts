import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { getIamIntegrationRuntime } from "../../../../../tests/integration/support/iam-integration-runtime";

describe("Access Provider bootstrap", () => {
    it("reuses an existing Permission by its canonical business key", async () => {
        const runtime = await getIamIntegrationRuntime();
        const suffix = randomUUID();
        const service = `bootstrap-${suffix}`;
        const resource = "provider";
        const action = "operate";
        const existingPermissionId = `existing_${suffix}`;

        await runtime.database.database.collection("access_permissions").insertOne({
            permissionId: existingPermissionId,
            service,
            resource,
            action,
            displayName: "Existing Provider Permission",
            description: "Existing canonical Permission used to certify bootstrap reconciliation.",
            classification: "administrative",
            createdAt: new Date().toISOString(),
        });

        const permissionId = await runtime.server.accessRuntime.components.providerBootstrap.ensurePermission(
            {
                service,
                resource,
                action,
                displayName: "Provider Permission",
                description: "Provider bootstrap Permission.",
            },
            "system:provider-bootstrap-certification",
        );

        expect(permissionId).toBe(existingPermissionId);
        await expect(
            runtime.database.database.collection("access_permissions").countDocuments({
                service,
                resource,
                action,
            }),
        ).resolves.toBe(1);
    });
});
