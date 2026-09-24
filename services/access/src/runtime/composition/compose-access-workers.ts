// services/access/src/runtime/composition/compose-access-workers.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS WORKERS
// -----------------------------------------------------------------------------
// Runtime composition for Access Operations™ scheduled workers.
//
// Purpose:
//   • construct assignment and restriction expiration workers
//   • inject worker-specific read, command, clock and observability contracts
//   • expose one lifecycle-friendly worker collection
//
// Boundary:
//   • does not start or schedule workers
//   • does not own process signals
//   • does not adapt incompatible use-case contracts
//   • contains no expiration business behavior
// -----------------------------------------------------------------------------

import {
    createExpireAssignmentsWorker,
    createExpireRestrictionsWorker,
    type ExpirableAssignmentsReadStore,
    type ExpirableRestrictionsReadStore,
    type ExpireAssignmentWorkerOperation,
    type ExpireAssignmentsWorker,
    type ExpireAssignmentsWorkerClock,
    type ExpireAssignmentsWorkerObservability,
    type ExpireRestrictionWorkerOperation,
    type ExpireRestrictionsWorker,
    type ExpireRestrictionsWorkerClock,
    type ExpireRestrictionsWorkerObservability,
} from "../../workers";

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessWorkerCompositionConfig {
    readonly assignmentBatchSize?:
    number;

    readonly restrictionBatchSize?:
    number;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface AccessAssignmentWorkerDependencies {
    readonly clock:
    ExpireAssignmentsWorkerClock;

    readonly readStore:
    ExpirableAssignmentsReadStore;

    readonly expireAssignment:
    ExpireAssignmentWorkerOperation;

    readonly observability:
    ExpireAssignmentsWorkerObservability;
}

export interface AccessRestrictionWorkerDependencies {
    readonly clock:
    ExpireRestrictionsWorkerClock;

    readonly readStore:
    ExpirableRestrictionsReadStore;

    readonly expireRestriction:
    ExpireRestrictionWorkerOperation;

    readonly observability:
    ExpireRestrictionsWorkerObservability;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessWorkersInput {
    readonly assignments:
    AccessAssignmentWorkerDependencies;

    readonly restrictions:
    AccessRestrictionWorkerDependencies;

    readonly config?:
    AccessWorkerCompositionConfig;
}

// -----------------------------------------------------------------------------
// COMMON WORKER CONTRACT
// -----------------------------------------------------------------------------

export interface AccessComposedWorker {
    runOnce(): Promise<unknown>;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ComposedAccessWorkers {
    readonly assignmentExpiration:
    ExpireAssignmentsWorker;

    readonly restrictionExpiration:
    ExpireRestrictionsWorker;

    readonly all:
    readonly AccessComposedWorker[];
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessWorkers(
    input:
    ComposeAccessWorkersInput,
): ComposedAccessWorkers {
    const assignmentExpiration =
        createExpireAssignmentsWorker({
            clock:
                input.assignments.clock,

            readStore:
                input.assignments.readStore,

            expireAssignment:
                input.assignments.expireAssignment,

            observability:
                input.assignments.observability,

            batchSize:
                input.config?.assignmentBatchSize,
        });

    const restrictionExpiration =
        createExpireRestrictionsWorker({
            clock:
                input.restrictions.clock,

            readStore:
                input.restrictions.readStore,

            expireRestriction:
                input.restrictions.expireRestriction,

            observability:
                input.restrictions.observability,

            batchSize:
                input.config?.restrictionBatchSize,
        });

    return {
        assignmentExpiration,
        restrictionExpiration,

        all: [
            assignmentExpiration,
            restrictionExpiration,
        ],
    };
}
