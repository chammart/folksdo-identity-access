// services/access/src/runtime/access-runtime.ts
// -----------------------------------------------------------------------------
// ACCESS RUNTIME
// -----------------------------------------------------------------------------
// Default runtime implementation for Access Operations™.
//
// Purpose:
//   • expose composed Access capabilities through one runtime object
//   • coordinate deterministic startup and graceful shutdown
//   • schedule composed expiration workers
//   • expose provider-neutral readiness validation
//   • register composed Access routes
//
// Boundary:
//   • does not construct use cases, adapters, API handlers or reactions
//   • does not own shared database, engine or transport infrastructure
//   • contains no Access business behavior
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
} from "fastify";

import {
    startAccessRuntime,
    stopAccessRuntime,
    validateAccessReadiness,
    createSystemLifecycleClock,
    type AccessReadinessResult,
    type AccessRuntimeLifecycleClock,
    type AccessRuntimeLifecycleState,
    type AccessRuntimeWorkerSchedule,
    type StartAccessRuntimeResult,
    type StopAccessRuntimeResult,
} from "./lifecycle";

import type {
    AccessRuntimeConfig,
} from "./access-runtime-config";

import type {
    AccessRuntime,
    AccessRuntimeComponents,
    AccessRuntimeLifecycleInput,
} from "./access-runtime-contracts";

// -----------------------------------------------------------------------------
// CONSTRUCTOR INPUT
// -----------------------------------------------------------------------------

export interface DefaultAccessRuntimeInput {
    readonly config:
    AccessRuntimeConfig;

    readonly components:
    AccessRuntimeComponents;

    readonly lifecycle:
    AccessRuntimeLifecycleInput;
}

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class DefaultAccessRuntime
implements AccessRuntime {
    public readonly config:
    AccessRuntimeConfig;

    public readonly components:
    AccessRuntimeComponents;

    private readonly lifecycle:
    AccessRuntimeLifecycleInput;

    private readonly clock:
    AccessRuntimeLifecycleClock;

    private state:
    AccessRuntimeLifecycleState | undefined;

    private startPromise:
    Promise<StartAccessRuntimeResult> | undefined;

    public constructor(
        input:
        DefaultAccessRuntimeInput,
    ) {
        this.config =
            input.config;

        this.components =
            input.components;

        this.lifecycle =
            input.lifecycle;

        this.clock =
            input.lifecycle.clock
            ?? createSystemLifecycleClock();
    }

    public get lifecycleState():
    AccessRuntimeLifecycleState | undefined {
        return this.state;
    }

    public get started():
    boolean {
        return this.state?.status === "started";
    }

    public async start():
    Promise<StartAccessRuntimeResult> {
        if (
            this.startPromise !== undefined
        ) {
            return this.startPromise;
        }

        const startPromise =
            this.performStart();

        this.startPromise =
            startPromise;

        try {
            return await startPromise;
        } catch (
            error
        ) {
            this.startPromise =
                undefined;

            throw error;
        }
    }

    public async stop():
    Promise<StopAccessRuntimeResult> {
        if (
            this.state === undefined
        ) {
            return {
                status:
                    "stopped",

                stoppedAt:
                    copyDate(
                        this.clock.now(),
                    ),

                drainedExecutionCount:
                    0,

                stoppedResourceNames:
                    [],

                failures:
                    [],
            };
        }

        return stopAccessRuntime(
            this.state,
        );
    }

    public async validateReadiness():
    Promise<AccessReadinessResult> {
        if (
            this.state === undefined
        ) {
            return {
                status:
                    "not_ready",

                checkedAt:
                    copyDate(
                        this.clock.now(),
                    ),

                lifecycleStatus:
                    "stopped",

                checks: [
                    {
                        name:
                            "access-runtime-lifecycle",

                        ready:
                            false,

                        details: {
                            status:
                                "not_started",
                        },
                    },
                ],
            };
        }

        return validateAccessReadiness({
            state:
                this.state,

            probes:
                this.lifecycle
                    .readinessProbes,

            requiredWorkerNames:
                resolveRequiredWorkerNames(
                    this.config,
                    this.components,
                ),

            probeTimeoutMs:
                this.config
                    .readiness
                    .probeTimeoutMs,
        });
    }

    public async registerRoutes(
        server:
        FastifyInstance,
    ): Promise<void> {
        if (
            this.components.routes === undefined
        ) {
            throw new Error(
                "Access runtime routes were not composed.",
            );
        }

        await this.components.routes.register(
            server,
        );
    }

    private async performStart():
    Promise<StartAccessRuntimeResult> {
        if (
            !this.config.enabled
        ) {
            throw new Error(
                "Access runtime is disabled and cannot be started.",
            );
        }

        const result =
            await startAccessRuntime({
                resources:
                    this.lifecycle.resources,

                workers:
                    createWorkerSchedules(
                        this.config,
                        this.components,
                    ),

                clock:
                    this.clock,

                logger:
                    this.lifecycle.logger,
            });

        this.state =
            result.state;

        return result;
    }
}

// -----------------------------------------------------------------------------
// WORKER SCHEDULES
// -----------------------------------------------------------------------------

function createWorkerSchedules(
    config:
    AccessRuntimeConfig,
    components:
    AccessRuntimeComponents,
): readonly AccessRuntimeWorkerSchedule[] {
    const schedules:
    AccessRuntimeWorkerSchedule[] = [];

    const assignmentConfig =
        config.workers
            .assignmentExpiration;

    const restrictionConfig =
        config.workers
            .restrictionExpiration;

    if (
        assignmentConfig.enabled
    ) {
        const worker =
            components.workers
                ?.assignmentExpiration;

        if (
            worker === undefined
        ) {
            throw new Error(
                "Access assignment expiration worker is enabled but was not composed.",
            );
        }

        schedules.push({
            name:
                assignmentConfig.name,

            worker,

            intervalMs:
                assignmentConfig.intervalMs,

            runOnStart:
                assignmentConfig.runOnStart,

            unref:
                assignmentConfig.unref,
        });
    }

    if (
        restrictionConfig.enabled
    ) {
        const worker =
            components.workers
                ?.restrictionExpiration;

        if (
            worker === undefined
        ) {
            throw new Error(
                "Access restriction expiration worker is enabled but was not composed.",
            );
        }

        schedules.push({
            name:
                restrictionConfig.name,

            worker,

            intervalMs:
                restrictionConfig.intervalMs,

            runOnStart:
                restrictionConfig.runOnStart,

            unref:
                restrictionConfig.unref,
        });
    }

    return schedules;
}

function resolveRequiredWorkerNames(
    config:
    AccessRuntimeConfig,
    components:
    AccessRuntimeComponents,
): readonly string[] {
    if (
        components.workers === undefined
    ) {
        return [];
    }

    const names:
    string[] = [];

    if (
        config.workers
            .assignmentExpiration
            .enabled
    ) {
        names.push(
            config.workers
                .assignmentExpiration
                .name,
        );
    }

    if (
        config.workers
            .restrictionExpiration
            .enabled
    ) {
        names.push(
            config.workers
                .restrictionExpiration
                .name,
        );
    }

    return names;
}

// -----------------------------------------------------------------------------
// DATE SUPPORT
// -----------------------------------------------------------------------------

function copyDate(
    value:
    Date,
): Date {
    if (
        Number.isNaN(
            value.getTime(),
        )
    ) {
        throw new TypeError(
            "Access runtime lifecycle clock returned an invalid Date.",
        );
    }

    return new Date(
        value.getTime(),
    );
}
