// services/access/src/workers/expire-assignments-worker.ts
// -----------------------------------------------------------------------------
// EXPIRE ASSIGNMENTS WORKER
// -----------------------------------------------------------------------------
// Scheduled initiator for expiration of time-bound Access assignments.
//
// Purpose:
//   • find active assignments whose expiration time has been reached
//   • invoke the Access-owned expiration use case for each due assignment
//   • expose deterministic execution results for runtime scheduling
//   • record worker execution through Access observability
//
// Boundary:
//   • does not implement assignment lifecycle behavior
//   • does not update MongoDB or any persistence provider directly
//   • does not emit Access events directly
//   • does not publish outbox messages directly
//   • does not own scheduling, intervals, distributed locking or shutdown
//
// Dependency direction:
//
//   ExpireAssignmentsWorker
//          ↓
//   ExpireAssignmentOperation
//          ↓
//   Access use case
//          ↓
//   Access business rules and atomic commit boundary
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const defaultExpireAssignmentsBatchSize =
    100;

// -----------------------------------------------------------------------------
// WORKER CLOCK
// -----------------------------------------------------------------------------

/**
 * Supplies deterministic execution time.
 *
 * Runtime composition provides the production clock. Tests may inject a fixed
 * implementation.
 */
export interface ExpireAssignmentsWorkerClock {
    now(): Date;
}

// -----------------------------------------------------------------------------
// READ-STORE CONTRACT
// -----------------------------------------------------------------------------

/**
 * Minimal assignment projection required by the worker.
 */
export interface ExpirableAssignmentReference {
    readonly assignmentId: string;

    readonly expiresAt: Date;
}

/**
 * Read-store query for assignments that are eligible for expiration.
 *
 * Implementations must return only assignments that:
 *   • are currently eligible for expiration
 *   • have expiresAt less than or equal to the supplied time
 *   • are ordered deterministically
 *
 * The worker must not depend on MongoDB query types or persistence documents.
 */
export interface ExpirableAssignmentsReadStore {
    listExpirableAssignments(
        input: ListExpirableAssignmentsInput,
    ): Promise<readonly ExpirableAssignmentReference[]>;
}

export interface ListExpirableAssignmentsInput {
    readonly now: Date;

    readonly limit: number;
}

// -----------------------------------------------------------------------------
// EXPIRATION OPERATION
// -----------------------------------------------------------------------------

/**
 * Internal command sent to the Access expiration use case.
 */
export interface ExpireAssignmentWorkerRequest {
    readonly assignmentId: string;

    readonly now: Date;
}

/**
 * Result required from the expiration use case.
 *
 * A replayed or concurrently processed assignment may legitimately return
 * changed false.
 */
export interface ExpireAssignmentWorkerOperationResult {
    readonly changed: boolean;
}

/**
 * Narrow contract satisfied by the real Expire Assignment use case during
 * Access runtime composition.
 */
export interface ExpireAssignmentWorkerOperation {
    execute(
        request: ExpireAssignmentWorkerRequest,
    ): Promise<ExpireAssignmentWorkerOperationResult>;
}

// -----------------------------------------------------------------------------
// OBSERVABILITY
// -----------------------------------------------------------------------------

/**
 * Transport- and vendor-neutral observability boundary for this worker.
 *
 * The observability implementation may translate these calls into metrics,
 * structured logs and traces.
 */
export interface ExpireAssignmentsWorkerObservability {
    executionStarted(
        details: ExpireAssignmentsWorkerStartedDetails,
    ): void;

    assignmentExpired(
        details: ExpireAssignmentsWorkerItemDetails,
    ): void;

    assignmentUnchanged(
        details: ExpireAssignmentsWorkerItemDetails,
    ): void;

    assignmentFailed(
        details: ExpireAssignmentsWorkerFailureDetails,
    ): void;

    executionCompleted(
        details: ExpireAssignmentsWorkerCompletedDetails,
    ): void;
}

export interface ExpireAssignmentsWorkerStartedDetails {
    readonly startedAt: Date;

    readonly batchSize: number;
}

export interface ExpireAssignmentsWorkerItemDetails {
    readonly assignmentId: string;
}

export interface ExpireAssignmentsWorkerFailureDetails {
    readonly assignmentId: string;

    readonly error: unknown;
}

export interface ExpireAssignmentsWorkerCompletedDetails {
    readonly startedAt: Date;

    readonly completedAt: Date;

    readonly discoveredCount: number;

    readonly changedCount: number;

    readonly unchangedCount: number;

    readonly failedCount: number;
}

// -----------------------------------------------------------------------------
// WORKER RESULT
// -----------------------------------------------------------------------------

export type ExpireAssignmentsWorkerRunStatus =
    | "completed"
    | "partially_completed";

export interface ExpireAssignmentsWorkerRunResult {
    readonly status: ExpireAssignmentsWorkerRunStatus;

    readonly startedAt: Date;

    readonly completedAt: Date;

    /**
     * Number of due assignments returned by the read store.
     */
    readonly discoveredCount: number;

    /**
     * Number of assignments whose canonical state changed to expired.
     */
    readonly changedCount: number;

    /**
     * Number of candidates already converged to the desired state.
     */
    readonly unchangedCount: number;

    /**
     * Number of expiration commands that failed.
     */
    readonly failedCount: number;

    /**
     * Stable identifiers of candidates that failed processing.
     */
    readonly failedAssignmentIds: readonly string[];
}

// -----------------------------------------------------------------------------
// WORKER CONTRACT
// -----------------------------------------------------------------------------

export interface ExpireAssignmentsWorker {
    /**
     * Executes one expiration batch.
     *
     * Runtime owns when and how frequently this method is called.
     */
    runOnce(): Promise<ExpireAssignmentsWorkerRunResult>;
}

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateExpireAssignmentsWorkerInput {
    readonly clock:
    ExpireAssignmentsWorkerClock;

    readonly readStore:
    ExpirableAssignmentsReadStore;

    /**
     * Real Access expiration use case injected by runtime composition.
     */
    readonly expireAssignment:
    ExpireAssignmentWorkerOperation;

    readonly observability:
    ExpireAssignmentsWorkerObservability;

    /**
     * Maximum number of candidates processed in one execution.
     *
     * Defaults to 100.
     */
    readonly batchSize?: number;
}

// -----------------------------------------------------------------------------
// WORKER FACTORY
// -----------------------------------------------------------------------------

export function createExpireAssignmentsWorker(
    input: CreateExpireAssignmentsWorkerInput,
): ExpireAssignmentsWorker {
    const batchSize =
        normalizeBatchSize(
            input.batchSize
            ?? defaultExpireAssignmentsBatchSize,
        );

    return {
        async runOnce(): Promise<ExpireAssignmentsWorkerRunResult> {
            const startedAt =
                input.clock.now();

            input.observability.executionStarted({
                startedAt,
                batchSize,
            });

            const candidates =
                await input.readStore.listExpirableAssignments({
                    now:
                        startedAt,

                    limit:
                        batchSize,
                });

            let changedCount =
                0;

            let unchangedCount =
                0;

            const failedAssignmentIds: string[] =
                [];

            for (
                const candidate
                of candidates
            ) {
                try {
                    const result =
                        await input.expireAssignment.execute({
                            assignmentId:
                                candidate.assignmentId,

                            now:
                                startedAt,
                        });

                    if (
                        result.changed
                    ) {
                        changedCount +=
                            1;

                        input.observability.assignmentExpired({
                            assignmentId:
                                candidate.assignmentId,
                        });
                    } else {
                        unchangedCount +=
                            1;

                        input.observability.assignmentUnchanged({
                            assignmentId:
                                candidate.assignmentId,
                        });
                    }
                } catch (
                error
                ) {
                    failedAssignmentIds.push(
                        candidate.assignmentId,
                    );

                    input.observability.assignmentFailed({
                        assignmentId:
                            candidate.assignmentId,

                        error,
                    });
                }
            }

            const completedAt =
                input.clock.now();

            const result: ExpireAssignmentsWorkerRunResult = {
                status:
                    failedAssignmentIds.length > 0
                        ? "partially_completed"
                        : "completed",

                startedAt,
                completedAt,

                discoveredCount:
                    candidates.length,

                changedCount,
                unchangedCount,

                failedCount:
                    failedAssignmentIds.length,

                failedAssignmentIds,
            };

            input.observability.executionCompleted({
                startedAt,
                completedAt,

                discoveredCount:
                    result.discoveredCount,

                changedCount:
                    result.changedCount,

                unchangedCount:
                    result.unchangedCount,

                failedCount:
                    result.failedCount,
            });

            return result;
        },
    };
}

// -----------------------------------------------------------------------------
// INTERNAL VALIDATION
// -----------------------------------------------------------------------------

function normalizeBatchSize(
    value: number,
): number {
    if (
        !Number.isInteger(
            value,
        )
        || value <= 0
    ) {
        throw new Error(
            "Expire assignments worker batchSize must be a positive integer.",
        );
    }

    return value;
}