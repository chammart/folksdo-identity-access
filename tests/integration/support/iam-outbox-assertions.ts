// tests/integration/support/iam-outbox-assertions.ts
// -----------------------------------------------------------------------------
// IAM OUTBOX ASSERTIONS
// -----------------------------------------------------------------------------
// Waits for real Processing delivery and certifies the persisted outbox record.
// -----------------------------------------------------------------------------

import {
    expect,
} from "@jest/globals";

import type {
    IamIntegrationDatabase,
} from "./iam-integration-database";

export async function expectIamOutboxDelivered(input: {
    readonly database: IamIntegrationDatabase;
    readonly subject: string;
    readonly expected?: Record<string, unknown>;
    readonly timeoutMilliseconds?: number;
}): Promise<void> {
    const record = await waitForIamCondition(
        async () => {
            const records = await input.database.findOutboxRecords({
                subject:
                    input.subject,
            });

            return records.find(
                (candidate) => candidate.status === "delivered",
            );
        },
        input.timeoutMilliseconds,
        `outbox subject ${input.subject} to be delivered`,
    );

    expect(record).toMatchObject({
        subject:
            input.subject,
        status:
            "delivered",
        attempts:
            expect.any(Number),
        publishedAt:
            expect.any(String),
        ...(input.expected ?? {}),
    });
}

export async function expectIamOutboxCommitted(input: {
    readonly database: IamIntegrationDatabase;
    readonly subject: string;
    readonly expected?: Record<string, unknown>;
}): Promise<void> {
    const records =
        await input.database.findOutboxRecords({
            subject:
                input.subject,
        });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
        subject:
            input.subject,
        status:
            "pending",
        attempts:
            0,
        publishedAt:
            null,
        ...(input.expected ?? {}),
    });
}

export async function waitForIamCondition<TResult>(
    read: () => Promise<TResult | null | undefined | false>,
    timeoutMilliseconds = readPositiveEnvironment(
        "IAM_TEST_WAIT_TIMEOUT_MILLISECONDS",
    ),
    description = "IAM integration condition",
): Promise<TResult> {
    const deadline =
        Date.now() + timeoutMilliseconds;

    while (Date.now() < deadline) {
        const result =
            await read();

        if (result !== null && result !== undefined && result !== false) {
            return result;
        }

        await new Promise<void>(
            (resolve) => setTimeout(
                resolve,
                readPositiveEnvironment(
                    "IAM_TEST_WAIT_INTERVAL_MILLISECONDS",
                ),
            ),
        );
    }

    throw new Error(
        `Timed out waiting for ${description}.`,
    );
}

function readPositiveEnvironment(
    name: string,
): number {
    const value =
        Number(
            process.env[name],
        );

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(
            `${name} must be a positive integer.`,
        );
    }

    return value;
}
