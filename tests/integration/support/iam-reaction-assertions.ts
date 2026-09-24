// tests/integration/support/iam-reaction-assertions.ts
// -----------------------------------------------------------------------------
// IAM REACTION ASSERTIONS
// -----------------------------------------------------------------------------
// Waits for observable canonical state produced by real NATS reactions.
// -----------------------------------------------------------------------------

import {
    expect,
} from "@jest/globals";

import type {
    Document,
    Filter,
} from "mongodb";

import type {
    IamIntegrationDatabase,
} from "./iam-integration-database";

import {
    waitForIamCondition,
} from "./iam-outbox-assertions";

export async function expectIamReactionState(input: {
    readonly database: IamIntegrationDatabase;
    readonly collectionName: string;
    readonly filter: Filter<Document>;
    readonly expected: Record<string, unknown>;
    readonly timeoutMilliseconds?: number;
}): Promise<void> {
    const state = await waitForIamCondition(
        async () => {
            const candidate =
                await input.database.findCanonicalState(
                    input.collectionName,
                    input.filter,
                );

            return candidate !== null
                && matchesExpectedState(
                    candidate,
                    input.expected,
                )
                ? candidate
                : undefined;
        },
        input.timeoutMilliseconds,
        `reaction state in ${input.collectionName}`,
    );

    expect(state).toMatchObject(
        input.expected,
    );
}

function matchesExpectedState(
    candidate: Record<string, unknown>,
    expected: Record<string, unknown>,
): boolean {
    return Object.entries(
        expected,
    ).every(
        ([key, expectedValue]) => {
            const candidateValue =
                candidate[key];

            if (
                isRecord(expectedValue)
                && isRecord(candidateValue)
            ) {
                return matchesExpectedState(
                    candidateValue,
                    expectedValue,
                );
            }

            return candidateValue === expectedValue;
        },
    );
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value);
}
