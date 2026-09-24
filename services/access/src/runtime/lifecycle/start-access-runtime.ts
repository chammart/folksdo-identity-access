// services/access/src/runtime/lifecycle/start-access-runtime.ts
// -----------------------------------------------------------------------------
// START ACCESS RUNTIME
// -----------------------------------------------------------------------------
// Lifecycle startup coordinator for Access Operations™.
//
// Purpose:
//   • start Access-owned runtime resources in deterministic order
//   • schedule repeated execution of composed Access workers
//   • prevent overlapping executions of the same worker
//   • retain the state required for readiness and graceful shutdown
//
// Boundary:
//   • does not compose Access use cases, API, reactions or workers
//   • does not own process signals
//   • does not create database, engine or transport connections
//   • does not implement worker business behavior
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// CLOCK
// -----------------------------------------------------------------------------

export interface AccessRuntimeLifecycleClock {
    now(): Date;
}

// -----------------------------------------------------------------------------
// OBSERVABILITY
// -----------------------------------------------------------------------------

export interface AccessRuntimeLifecycleLogger {
    info(
        message: string,
        details?: Readonly<Record<string, unknown>>,
    ): void;

    warn(
        message: string,
        details?: Readonly<Record<string, unknown>>,
    ): void;

    error(
        message: string,
        details?: Readonly<Record<string, unknown>>,
    ): void;
}

// -----------------------------------------------------------------------------
// MANAGED RESOURCE
// -----------------------------------------------------------------------------

/**
 * Runtime-owned resource with explicit startup and shutdown behavior.
 *
 * Examples may include a reaction subscription or another Access-owned
 * resource. Shared platform infrastructure must not be closed through this
 * contract unless Access owns its lifecycle.
 */
export interface AccessRuntimeManagedResource {
    readonly name: string;

    start():
    Promise<void> | void;

    stop():
    Promise<void> | void;
}

// -----------------------------------------------------------------------------
// SCHEDULED WORKER
// -----------------------------------------------------------------------------

export interface AccessRuntimeScheduledWorker {
    runOnce(): Promise<unknown>;
}

export interface AccessRuntimeWorkerSchedule {
    readonly name: string;

    readonly worker:
    AccessRuntimeScheduledWorker;

    readonly intervalMs:
    number;

    /**
     * Runs one worker iteration immediately after startup.
     *
     * Immediate execution is asynchronous and does not block runtime startup.
     */
    readonly runOnStart?:
    boolean;

    /**
     * Allows the Node.js process to exit when this timer is the only remaining
     * active handle.
     *
     * Defaults to true.
     */
    readonly unref?:
    boolean;
}

// -----------------------------------------------------------------------------
// LIFECYCLE STATE
// -----------------------------------------------------------------------------

export type AccessRuntimeLifecycleStatus =
    | "starting"
    | "started"
    | "stopping"
    | "stopped"
    | "failed";

export interface AccessRuntimeLifecycleState {
    status:
    AccessRuntimeLifecycleStatus;

    readonly createdAt:
    Date;

    startedAt?:
    Date;

    stoppedAt?:
    Date;

    failure?:
    unknown;

    readonly startedResources:
    AccessRuntimeManagedResource[];

    readonly scheduledWorkerNames:
    Set<string>;

    readonly timers:
    Map<
        string,
        ReturnType<typeof setInterval>
    >;

    readonly runningWorkerNames:
    Set<string>;

    readonly inFlightExecutions:
    Set<Promise<void>>;

    readonly clock:
    AccessRuntimeLifecycleClock;

    readonly logger:
    AccessRuntimeLifecycleLogger;

    stopPromise?:
    Promise<unknown>;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface StartAccessRuntimeInput {
    readonly resources?:
    readonly AccessRuntimeManagedResource[];

    readonly workers?:
    readonly AccessRuntimeWorkerSchedule[];

    readonly clock?:
    AccessRuntimeLifecycleClock;

    readonly logger?:
    AccessRuntimeLifecycleLogger;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface StartAccessRuntimeResult {
    readonly state:
    AccessRuntimeLifecycleState;

    readonly startedAt:
    Date;

    readonly startedResourceNames:
    readonly string[];

    readonly scheduledWorkerNames:
    readonly string[];
}

// -----------------------------------------------------------------------------
// STARTUP
// -----------------------------------------------------------------------------

export async function startAccessRuntime(
    input:
    StartAccessRuntimeInput,
): Promise<StartAccessRuntimeResult> {
    const clock =
        input.clock
        ?? createSystemLifecycleClock();

    const logger =
        input.logger
        ?? createNoopLifecycleLogger();

    const resources =
        [...(input.resources ?? [])];

    const workers =
        [...(input.workers ?? [])];

    validateResources(
        resources,
    );

    validateWorkerSchedules(
        workers,
    );

    const state:
    AccessRuntimeLifecycleState = {
        status:
            "starting",

        createdAt:
            copyDate(
                clock.now(),
            ),

        startedResources:
            [],

        scheduledWorkerNames:
            new Set<string>(),

        timers:
            new Map(),

        runningWorkerNames:
            new Set<string>(),

        inFlightExecutions:
            new Set<Promise<void>>(),

        clock,
        logger,
    };

    logger.info(
        "Access runtime startup started.",
        {
            resourceCount:
                resources.length,

            workerCount:
                workers.length,
        },
    );

    try {
        for (
            const resource
            of resources
        ) {
            await resource.start();

            state.startedResources.push(
                resource,
            );

            logger.info(
                "Access runtime resource started.",
                {
                    resourceName:
                        resource.name,
                },
            );
        }

        for (
            const schedule
            of workers
        ) {
            scheduleWorker(
                state,
                schedule,
            );
        }

        const startedAt =
            copyDate(
                clock.now(),
            );

        state.startedAt =
            startedAt;

        state.status =
            "started";

        logger.info(
            "Access runtime startup completed.",
            {
                startedAt:
                    startedAt.toISOString(),

                startedResourceCount:
                    state.startedResources.length,

                scheduledWorkerCount:
                    state.scheduledWorkerNames.size,
            },
        );

        return {
            state,
            startedAt:
                copyDate(startedAt),

            startedResourceNames:
                state.startedResources.map(
                    resource =>
                        resource.name,
                ),

            scheduledWorkerNames:
                [...state.scheduledWorkerNames],
        };
    } catch (
        error
    ) {
        state.status =
            "failed";

        state.failure =
            error;

        await rollbackStartup(
            state,
        );

        logger.error(
            "Access runtime startup failed.",
            {
                error,
            },
        );

        throw error;
    }
}

// -----------------------------------------------------------------------------
// WORKER SCHEDULING
// -----------------------------------------------------------------------------

function scheduleWorker(
    state:
    AccessRuntimeLifecycleState,
    schedule:
    AccessRuntimeWorkerSchedule,
): void {
    const execute =
        (): void => {
            if (
                state.status !== "starting"
                && state.status !== "started"
            ) {
                return;
            }

            if (
                state.runningWorkerNames.has(
                    schedule.name,
                )
            ) {
                state.logger.warn(
                    "Access worker execution skipped because the previous execution is still running.",
                    {
                        workerName:
                            schedule.name,
                    },
                );

                return;
            }

            state.runningWorkerNames.add(
                schedule.name,
            );

            let execution:
            Promise<void>;

            execution =
                Promise.resolve()
                    .then(
                        async () => {
                            await schedule.worker.runOnce();
                        },
                    )
                    .catch(
                        error => {
                            state.logger.error(
                                "Access worker execution failed.",
                                {
                                    workerName:
                                        schedule.name,

                                    error,
                                },
                            );
                        },
                    )
                    .finally(
                        () => {
                            state.runningWorkerNames.delete(
                                schedule.name,
                            );

                            state.inFlightExecutions.delete(
                                execution,
                            );
                        },
                    );

            state.inFlightExecutions.add(
                execution,
            );
        };

    const timer =
        setInterval(
            execute,
            schedule.intervalMs,
        );

    if (
        schedule.unref !== false
        && hasUnref(timer)
    ) {
        timer.unref();
    }

    state.timers.set(
        schedule.name,
        timer,
    );

    state.scheduledWorkerNames.add(
        schedule.name,
    );

    state.logger.info(
        "Access worker scheduled.",
        {
            workerName:
                schedule.name,

            intervalMs:
                schedule.intervalMs,

            runOnStart:
                schedule.runOnStart === true,
        },
    );

    if (
        schedule.runOnStart === true
    ) {
        execute();
    }
}

// -----------------------------------------------------------------------------
// STARTUP ROLLBACK
// -----------------------------------------------------------------------------

async function rollbackStartup(
    state:
    AccessRuntimeLifecycleState,
): Promise<void> {
    clearScheduledWorkers(
        state,
    );

    await Promise.allSettled(
        [...state.inFlightExecutions],
    );

    for (
        const resource
        of [...state.startedResources].reverse()
    ) {
        try {
            await resource.stop();
        } catch (
            error
        ) {
            state.logger.error(
                "Access runtime resource rollback failed.",
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
}

function clearScheduledWorkers(
    state:
    AccessRuntimeLifecycleState,
): void {
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
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

function validateResources(
    resources:
    readonly AccessRuntimeManagedResource[],
): void {
    const names =
        new Set<string>();

    for (
        const resource
        of resources
    ) {
        const name =
            normalizeName(
                resource.name,
                "Access runtime resource",
            );

        if (
            names.has(name)
        ) {
            throw new Error(
                `Access runtime resource "${name}" is registered more than once.`,
            );
        }

        names.add(name);
    }
}

function validateWorkerSchedules(
    workers:
    readonly AccessRuntimeWorkerSchedule[],
): void {
    const names =
        new Set<string>();

    for (
        const schedule
        of workers
    ) {
        const name =
            normalizeName(
                schedule.name,
                "Access worker",
            );

        if (
            names.has(name)
        ) {
            throw new Error(
                `Access worker "${name}" is scheduled more than once.`,
            );
        }

        if (
            !Number.isSafeInteger(
                schedule.intervalMs,
            )
            || schedule.intervalMs <= 0
        ) {
            throw new RangeError(
                `Access worker "${name}" interval must be a positive safe integer.`,
            );
        }

        names.add(name);
    }
}

function normalizeName(
    value: string,
    label: string,
): string {
    const normalized =
        value.trim();

    if (
        normalized.length === 0
    ) {
        throw new Error(
            `${label} name must be a non-empty string.`,
        );
    }

    return normalized;
}

// -----------------------------------------------------------------------------
// DEFAULT INFRASTRUCTURE
// -----------------------------------------------------------------------------

export function createSystemLifecycleClock():
AccessRuntimeLifecycleClock {
    return {
        now:
            () =>
                new Date(),
    };
}

export function createNoopLifecycleLogger():
AccessRuntimeLifecycleLogger {
    return {
        info:
            () =>
                undefined,

        warn:
            () =>
                undefined,

        error:
            () =>
                undefined,
    };
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

function hasUnref(
    timer:
    unknown,
): timer is {
    unref(): void;
} {
    return (
        typeof timer === "object"
        && timer !== null
        && "unref" in timer
        && typeof timer.unref === "function"
    );
}
