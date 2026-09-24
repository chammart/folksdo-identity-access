// tests/e2e/support/iam-e2e-outbox-assertions.ts
// -----------------------------------------------------------------------------
// IAM HTTP E2E OUTBOX ASSERTIONS
// -----------------------------------------------------------------------------
// Certifies committed outbox records while real Processing may deliver them.
// The integration-only pending-state assertion remains unchanged.
// -----------------------------------------------------------------------------

import { expect } from "@jest/globals";
import type { IamIntegrationDatabase } from "../../integration/support/iam-integration-database";

export async function expectIamE2eOutboxCommitted(input: {
    readonly database: IamIntegrationDatabase;
    readonly subject: string;
    readonly expected?: Record<string, unknown>;
}): Promise<void> {
    const records = await input.database.findOutboxRecords({
        subject: input.subject,
    });

    expect(records).toHaveLength(1);

    const record = records[0];

    expect(record).toMatchObject({
        subject: input.subject,
        ...(input.expected ?? {}),
    });

    expect([
        "pending",
        "in_progress",
        "delivered",
    ]).toContain(record.status);

    if (record.status === "pending") {
        expect(record).toMatchObject({
            attempts: 0,
            publishedAt: null,
        });

        return;
    }

    expect(record.attempts).toEqual(expect.any(Number));
    expect(record.attempts).toBeGreaterThanOrEqual(1);

    if (record.status === "in_progress") {
        expect(record.publishedAt).toBeNull();

        return;
    }

    expect(record.publishedAt).toEqual(expect.any(String));

    expect(
        Number.isNaN(Date.parse(record.publishedAt as string)),
    ).toBe(false);
}