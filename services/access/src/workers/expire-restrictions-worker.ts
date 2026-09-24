// services/access/src/workers/expire-restrictions-worker.ts
// -----------------------------------------------------------------------------
// EXPIRE RESTRICTIONS WORKER
// -----------------------------------------------------------------------------
// Scheduled initiator for expiration of time-bound Access restrictions.
//
// Purpose:
//   • find active restrictions whose expiration time has been reached
//   • invoke the Access-owned expiration use case for each due restriction
//   • expose deterministic execution results for runtime scheduling
//   • record worker execution through Access observability
//
// Boundary:
//   • does not implement restriction lifecycle behavior
//   • does not update MongoDB or any persistence provider directly
//   • does not emit Access events directly
//   • does not publish outbox messages directly
//   • does not own scheduling, intervals, distributed locking or shutdown
//
// Dependency direction:
//
//   ExpireRestrictionsWorker
//          ↓
//   ExpireRestrictionOperation
//          ↓
//   Access use case
//          ↓
//   Access business rules and atomic commit boundary
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const defaultExpireRestrictionsBatchSize =
    100;

// -----------------------------------------------------------------------------
// WORKER CLOCK
// -----------------------------------------------------------------------------

export interface ExpireRestrictionsWorkerClock {
    now(): Date;
}

// -----------------------------------------------------------------------------
// READ-STORE CONTRACT
// -----------------------------------------------------------------------------

/**
 * Minimal restriction projection required by the worker.
 */
export interface ExpirableRestrictionReference {
    readonly restrictionId: string;

    readonly expiresAt: Date;
}

/**
 * Read-store query for restrictions eligible for expiration.
 *
 * Implementations must return only restrictions that:
 *   • are currently active
 *   • have expiresAt less than or equal to the supplied time
 *   • are ordered deterministically
 *
 * Persistence-specific query and document types must not cross this boundary.
 */
export interface ExpirableRestrictionsReadStore {
    listExpirableRestrictions(
        input: ListExpirableRestrictionsInput,
    ): Promise<readonly ExpirableRestrictionReference[]>;
}

export interface ListExpirableRestrictionsInput {
    readonly now: Date;

    readonly limit: number;
}

// -----------------------------------------------------------------------------
// EXPIRATION OPERATION
// -----------------------------------------------------------------------------

export interface ExpireRestrictionWorkerRequest {
    readonly restrictionId: string;

    readonly now: Date;
}

export interface ExpireRestrictionWorkerOperationResult {
    /**
     * Replayed or concurrently processed commands may return false.
     */
    readonly changed: boolean;
}

/**
 * Narrow contract satisfied by the real Expire Restriction use case during
 * Access runtime composition.
 */
export interface ExpireRestrictionWorkerOperation {
    execute(
        request: ExpireRestrictionWorkerRequest,
    ): Promise<ExpireRestrictionWorkerOperationResult>;
}

// -----------------------------------------------------------------------------
// OBSERVABILITY
// -----------------------------------------------------------------------------

export interface ExpireRestrictionsWorkerObservability {
    executionStarted(
        details: ExpireRestrictionsWorkerStartedDetails,
    ): void;

    restrictionExpired(
        details: ExpireRestrictionsWorkerItemDetails,
    ): void;

    restrictionUnchanged(
        details: ExpireRestrictionsWorkerItemDetails,
    ): void;

    restrictionFailed(
        details: ExpireRestrictionsWorkerFailureDetails,
    ): void;

    executionCompleted(
        details: ExpireRestrictionsWorkerCompletedDetails,
    ): void;
}

export interface ExpireRestrictionsWorkerStartedDetails {
    readonly startedAt: Date;

    readonly batchSize: number;
}

export interface ExpireRestrictionsWorkerItemDetails {
    readonly restrictionId: string;
}

export interface ExpireRestrictionsWorkerFailureDetails {
    readonly restrictionId: string;

    readonly error: unknown;
}

export interface ExpireRestrictionsWorkerCompletedDetails {
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

export type ExpireRestrictionsWorkerRunStatus =
    | "completed"
    | "partially_completed";

export interface ExpireRestrictionsWorkerRunResult {
    readonly status: ExpireRestrictionsWorkerRunStatus;

    readonly startedAt: Date;

    readonly completedAt: Date;

    readonly discoveredCount: number;

    readonly changedCount: number;

    readonly unchangedCount: number;

    readonly failedCount: number;

    readonly failedRestrictionIds: readonly string[];
}

// -----------------------------------------------------------------------------
// WORKER CONTRACT
// -----------------------------------------------------------------------------

export interface ExpireRestrictionsWorker {
    /**
     * Executes one restriction-expiration batch.
     *
     * Runtime owns scheduling and repeated invocation.
     */
    runOnce(): Promise<ExpireRestrictionsWorkerRunResult>;
}

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateExpireRestrictionsWorkerInput {
    readonly clock:
    ExpireRestrictionsWorkerClock;

    readonly readStore:
    ExpirableRestrictionsReadStore;

    /**
     * Real Access expiration use case injected by runtime composition.
     */
    readonly expireRestriction:
    ExpireRestrictionWorkerOperation;

    readonly observability:
    ExpireRestrictionsWorkerObservability;

    /**
     * Maximum number of candidates processed per execution.
     *
     * Defaults to 100.
     */
    readonly batchSize?: number;
}

// -----------------------------------------------------------------------------
// WORKER FACTORY
// -----------------------------------------------------------------------------

export function createExpireRestrictionsWorker(
    input: CreateExpireRestrictionsWorkerInput,
): ExpireRestrictionsWorker {
    const batchSize =
        normalizeBatchSize(
            input.batchSize
            ?? defaultExpireRestrictionsBatchSize,
        );

    return {
        async runOnce(): Promise<ExpireRestrictionsWorkerRunResult> {
            const startedAt =
                input.clock.now();

            input.observability.executionStarted({
                startedAt,
                batchSize,
            });

            const candidates =
                await input.readStore.listExpirableRestrictions({
                    now:
                        startedAt,

                    limit:
                        batchSize,
                });

            let changedCount =
                0;

            let unchangedCount =
                0;

            const failedRestrictionIds: string[] =
                [];

            for (
                const candidate
                of candidates
            ) {
                try {
                    const result =
                        await input.expireRestriction.execute({
                            restrictionId:
                                candidate.restrictionId,

                            now:
                                startedAt,
                        });

                    if (
                        result.changed
                    ) {
                        changedCount +=
                            1;

                        input.observability.restrictionExpired({
                            restrictionId:
                                candidate.restrictionId,
                        });
                    } else {
                        unchangedCount +=
                            1;

                        input.observability.restrictionUnchanged({
                            restrictionId:
                                candidate.restrictionId,
                        });
                    }
                } catch (
                error
                ) {
                    failedRestrictionIds.push(
                        candidate.restrictionId,
                    );

                    input.observability.restrictionFailed({
                        restrictionId:
                            candidate.restrictionId,

                        error,
                    });
                }
            }

            const completedAt =
                input.clock.now();

            const result: ExpireRestrictionsWorkerRunResult = {
                status:
                    failedRestrictionIds.length > 0
                        ? "partially_completed"
                        : "completed",

                startedAt,
                completedAt,

                discoveredCount:
                    candidates.length,

                changedCount,
                unchangedCount,

                failedCount:
                    failedRestrictionIds.length,

                failedRestrictionIds,
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
            "Expire restrictions worker batchSize must be a positive integer.",
        );
    }

    return value;
}