// services/access/src/runtime/lifecycle/stop-access-runtime.ts
// -----------------------------------------------------------------------------
// STOP ACCESS RUNTIME
// -----------------------------------------------------------------------------
// Graceful shutdown coordinator for Access Operations™.
//
// Purpose:
//   • stop new scheduled worker executions
//   • drain currently running worker iterations
//   • stop Access-owned runtime resources in reverse startup order
//   • expose deterministic shutdown results
//
// Boundary:
//   • does not close shared platform infrastructure
//   • does not own process signals
//   • does not implement worker or reaction behavior
//   • operates only on lifecycle state created by startAccessRuntime
// -----------------------------------------------------------------------------

import type {
    AccessRuntimeLifecycleState,
} from "./start-access-runtime";

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export type StopAccessRuntimeStatus =
    | "stopped"
    | "partially_stopped";

export interface StopAccessRuntimeFailure {
    readonly resourceName:
    string;

    readonly error:
    unknown;
}

export interface StopAccessRuntimeResult {
    readonly status:
    StopAccessRuntimeStatus;

    readonly stoppedAt:
    Date;

    readonly drainedExecutionCount:
    number;

    readonly stoppedResourceNames:
    readonly string[];

    readonly failures:
    readonly StopAccessRuntimeFailure[];
}

// -----------------------------------------------------------------------------
// SHUTDOWN
// -----------------------------------------------------------------------------

export async function stopAccessRuntime(
    state:
    AccessRuntimeLifecycleState,
): Promise<StopAccessRuntimeResult> {
    if (
        state.stopPromise !== undefined
    ) {
        return state.stopPromise as Promise<StopAccessRuntimeResult>;
    }

    const stopPromise =
        performStop(
            state,
        );

    state.stopPromise =
        stopPromise;

    return stopPromise;
}

async function performStop(
    state:
    AccessRuntimeLifecycleState,
): Promise<StopAccessRuntimeResult> {
    if (
        state.status === "stopped"
    ) {
        return {
            status:
                "stopped",

            stoppedAt:
                copyDate(
                    state.stoppedAt
                    ?? state.clock.now(),
                ),

            drainedExecutionCount:
                0,

            stoppedResourceNames:
                [],

            failures:
                [],
        };
    }

    state.status =
        "stopping";

    state.logger.info(
        "Access runtime shutdown started.",
        {
            scheduledWorkerCount:
                state.timers.size,

            runningWorkerCount:
                state.inFlightExecutions.size,

            startedResourceCount:
                state.startedResources.length,
        },
    );

    for (
        const timer
        of state.timers.values()
    ) {
        clearInterval(
            timer,
        );
    }

    state.timers.clear();
    state.scheduledWorkerNames.clear();

    const inFlightExecutions =
        [...state.inFlightExecutions];

    await Promise.allSettled(
        inFlightExecutions,
    );

    const stoppedResourceNames:
    string[] = [];

    const failures:
    StopAccessRuntimeFailure[] = [];

    for (
        const resource
        of [...state.startedResources].reverse()
    ) {
        try {
            await resource.stop();

            stoppedResourceNames.push(
                resource.name,
            );

            state.logger.info(
                "Access runtime resource stopped.",
                {
                    resourceName:
                        resource.name,
                },
            );
        } catch (
            error
        ) {
            failures.push({
                resourceName:
                    resource.name,

                error,
            });

            state.logger.error(
                "Access runtime resource shutdown failed.",
                {
                    resourceName:
                        resource.name,

                    error,
                },
            );
        }
    }

    state.startedResources.length =
        0;

    const stoppedAt =
        copyDate(
            state.clock.now(),
        );

    state.stoppedAt =
        stoppedAt;

    state.status =
        failures.length === 0
            ? "stopped"
            : "failed";

    const result:
    StopAccessRuntimeResult = {
        status:
            failures.length === 0
                ? "stopped"
                : "partially_stopped",

        stoppedAt:
            copyDate(stoppedAt),

        drainedExecutionCount:
            inFlightExecutions.length,

        stoppedResourceNames,
        failures,
    };

    state.logger.info(
        "Access runtime shutdown completed.",
        {
            status:
                result.status,

            stoppedAt:
                stoppedAt.toISOString(),

            drainedExecutionCount:
                result.drainedExecutionCount,

            stoppedResourceCount:
                stoppedResourceNames.length,

            failureCount:
                failures.length,
        },
    );

    return result;
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

function copyDate(
    value: Date,
): Date {
    if (
        Number.isNaN(
            value.getTime(),
        )
    ) {
        throw new TypeError(
            "Access runtime lifecycle clock must return a valid Date.",
        );
    }

    return new Date(
        value.getTime(),
    );
}
