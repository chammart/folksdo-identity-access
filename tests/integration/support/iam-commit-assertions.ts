// tests/integration/support/iam-commit-assertions.ts
// -----------------------------------------------------------------------------
// IAM COMMIT ASSERTIONS
// -----------------------------------------------------------------------------
// Certifies IAM state, replayable event, and aggregate-version persistence.
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

export async function expectIamCommit(input: {
    readonly database: IamIntegrationDatabase;
    readonly state: {
        readonly collectionName: string;
        readonly filter: Filter<Document>;
        readonly expected: Record<string, unknown>;
    };
    readonly event: {
        readonly eventType: string;
        readonly aggregateType: string;
        readonly aggregateId: string;
        readonly expected?: Record<string, unknown>;
    };
    readonly aggregateVersion: number;
}): Promise<void> {
    const state = await input.database.findCanonicalState(
        input.state.collectionName,
        input.state.filter,
    );

    expect(state).toMatchObject(
        input.state.expected,
    );

    const events = await input.database.findEvents({
        eventType:
            input.event.eventType,
        aggregateType:
            input.event.aggregateType,
        aggregateId:
            input.event.aggregateId,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
        eventType:
            input.event.eventType,
        aggregateType:
            input.event.aggregateType,
        aggregateId:
            input.event.aggregateId,
        aggregateVersion:
            input.aggregateVersion,
        ...(input.event.expected ?? {}),
    });

    await expect(
        input.database.findAggregateVersion(
            input.event.aggregateType,
            input.event.aggregateId,
        ),
    ).resolves.toBe(
        input.aggregateVersion,
    );
}
