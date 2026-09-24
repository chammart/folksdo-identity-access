// services/access/src/usecases/access-commit.ts
// -----------------------------------------------------------------------------
// ACCESS COMMIT
// -----------------------------------------------------------------------------
// Shared atomic commit boundary for Access Operations™.
//
// Purpose:
//   • commit Access state changes atomically
//   • append replayable Access business events
//   • enqueue Access outbox messages in the same transaction
//   • translate infrastructure failures into Access semantic errors
//   • preserve Folksdo Engine dependency direction
// -----------------------------------------------------------------------------

import {
    AccessCommitFailedError,
} from "../../errors";

import type {
    AccessCommitEvent,
    AccessEngineCommitResult,
    AccessOutboxMessage,
    AccessStateChange,
    FolksdoEngine,
} from "./access-usecase-contracts";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CommitAccessInput {
    readonly aggregateType: string;

    readonly aggregateId: string;

    readonly expectedVersion?: number;

    readonly stateChanges:
    readonly AccessStateChange[];

    readonly events:
    readonly AccessCommitEvent[];

    readonly outbox:
    readonly AccessOutboxMessage[];
}

// -----------------------------------------------------------------------------
// COMMIT ACCESS
// -----------------------------------------------------------------------------

export async function commitAccess(
    engine: FolksdoEngine,
    input: CommitAccessInput,
): Promise<AccessEngineCommitResult> {
    try {
        return await engine.commit({
            aggregateType:
                input.aggregateType,

            aggregateId:
                input.aggregateId,

            expectedVersion:
                input.expectedVersion,

            stateChanges:
                input.stateChanges,

            events:
                input.events,

            outbox:
                input.outbox,
        });
    } catch {
        throw new AccessCommitFailedError();
    }
}