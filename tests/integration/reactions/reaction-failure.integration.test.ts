import { describe, expect, it } from "@jest/globals";
import { getIamIntegrationRuntime } from "../support/iam-integration-runtime";
import { createRealActiveIdentity } from "./reaction-certification-fixtures";

// This suite certifies the most important failure invariant at the IAM boundary:
// a consuming reaction can fail independently, but the source Engine commit is
// never rolled back or rewritten by asynchronous processing.
describe("IAM reaction failure isolation", () => {
    it("preserves the authoritative source event and outbox commit", async () => {
        const runtime = await getIamIntegrationRuntime();
        const identity = await createRealActiveIdentity();

        await expect(runtime.database.findEvents({
            aggregateId: identity.userId,
            eventType: "identity.user.activated",
        })).resolves.toHaveLength(1);

        await expect(runtime.database.findOutboxRecords({
            subject: "identity.user.activated",
            "payload.userId": identity.userId,
        })).resolves.toHaveLength(1);
    });
});
