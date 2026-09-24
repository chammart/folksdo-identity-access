// services/membership/src/usecases/membership-commit.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP COMMIT
// -----------------------------------------------------------------------------
// Shared Folksdo Engine™ commit boundary for Membership mutations.
//
// Purpose:
//   • keep Engine commit mechanics out of individual business use cases
//   • commit state changes, replayable events, and outbox messages atomically
//   • preserve the aggregate commit boundary
//   • translate infrastructure failures into a Membership semantic error
//   • retain the original infrastructure failure as the error cause
// -----------------------------------------------------------------------------

import type {
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import {
    MembershipCommitFailedError,
} from "../errors";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface CommitMembershipInput {
    readonly dependencies: MembershipMutationDependencies;

    readonly context: RuntimeContext;

    readonly aggregateType: string;

    readonly aggregateId: string;

    readonly stateChanges: readonly StateChange[];

    readonly events: readonly ReplayableEvent[];

    readonly outbox: readonly OutboxMessage[];
}

// -----------------------------------------------------------------------------
// COMMIT
// -----------------------------------------------------------------------------

export async function commitMembership(
    input: CommitMembershipInput,
): Promise<void> {
    try {
        await input.dependencies.engine.state.commit({
            context:
                input.context,

            aggregate: {
                aggregateType:
                    input.aggregateType,

                aggregateId:
                    input.aggregateId,
            },

            stateChanges:
                input.stateChanges,

            events:
                input.events,

            outbox:
                input.outbox,
        });
    } catch (error) {
        throw new MembershipCommitFailedError(
            error,
        );
    }
}