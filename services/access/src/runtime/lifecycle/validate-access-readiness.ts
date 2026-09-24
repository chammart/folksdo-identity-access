// services/access/src/runtime/lifecycle/validate-access-readiness.ts
// -----------------------------------------------------------------------------
// VALIDATE ACCESS READINESS
// -----------------------------------------------------------------------------
// Provider-neutral readiness validation for Access Operations™.
//
// Purpose:
//   • verify that the Access runtime has completed startup
//   • verify that required worker schedules are active
//   • execute explicit readiness probes for required dependencies
//   • return deterministic details suitable for a readiness endpoint
//
// Boundary:
//   • does not assume undocumented MongoDB, engine or transport health APIs
//   • does not mutate Access state
//   • does not start or stop runtime resources
//   • contains no authorization business behavior
// -----------------------------------------------------------------------------

import type {
    AccessRuntimeLifecycleState,
} from "./start-access-runtime";

// -----------------------------------------------------------------------------
// READINESS PROBE
// -----------------------------------------------------------------------------

export interface AccessReadinessProbeResult {
    readonly ready:
    boolean;

    readonly details?:
    Readonly<Record<string, unknown>>;
}

export interface AccessReadinessProbe {
    readonly name:
    string;

    check():
    Promise<AccessReadinessProbeResult | boolean>
    | AccessReadinessProbeResult
    | boolean;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ValidateAccessReadinessInput {
    readonly state:
    AccessRuntimeLifecycleState;

    /**
     * Explicit dependency probes supplied by the platform composition root.
     *
     * Typical probes may represent the Access read database, Folksdo Engine
     * commit capability or reaction transport registration. Each probe must
     * use a real provider-owned health contract.
     */
    readonly probes?:
    readonly AccessReadinessProbe[];

    /**
     * Worker schedules that must be active for the service to be ready.
     */
    readonly requiredWorkerNames?:
    readonly string[];

    /**
     * Maximum execution time for each readiness probe.
     *
     * Defaults to 5,000 milliseconds.
     */
    readonly probeTimeoutMs?:
    number;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export type AccessReadinessStatus =
    | "ready"
    | "not_ready";

export interface AccessReadinessCheckResult {
    readonly name:
    string;

    readonly ready:
    boolean;

    readonly details?:
    Readonly<Record<string, unknown>>;

    readonly error?:
    unknown;
}

export interface AccessReadinessResult {
    readonly status:
    AccessReadinessStatus;

    readonly checkedAt:
    Date;

    readonly lifecycleStatus:
    AccessRuntimeLifecycleState["status"];

    readonly checks:
    readonly AccessReadinessCheckResult[];
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

export async function validateAccessReadiness(
    input:
    ValidateAccessReadinessInput,
): Promise<AccessReadinessResult> {
    const probes =
        [...(input.probes ?? [])];

    const requiredWorkerNames =
        normalizeUniqueNames(
            input.requiredWorkerNames ?? [],
            "Access readiness worker",
        );

    validateProbes(
        probes,
    );

    const probeTimeoutMs =
        normalizeProbeTimeout(
            input.probeTimeoutMs
            ?? 5_000,
        );

    const checkedAt =
        copyDate(
            input.state.clock.now(),
        );

    const checks:
    AccessReadinessCheckResult[] = [];

    checks.push({
        name:
            "access-runtime-lifecycle",

        ready:
            input.state.status === "started",

        details: {
            status:
                input.state.status,

            startedAt:
                input.state.startedAt
                    ?.toISOString(),
        },
    });

    for (
        const workerName
        of requiredWorkerNames
    ) {
        const scheduled =
            input.state.scheduledWorkerNames.has(
                workerName,
            )
            && input.state.timers.has(
                workerName,
            );

        checks.push({
            name:
                `access-worker:${workerName}`,

            ready:
                scheduled,

            details: {
                scheduled,

                running:
                    input.state.runningWorkerNames.has(
                        workerName,
                    ),
            },
        });
    }

    const probeChecks =
        await Promise.all(
            probes.map(
                probe =>
                    executeProbe(
                        probe,
                        probeTimeoutMs,
                    ),
            ),
        );

    checks.push(
        ...probeChecks,
    );

    const ready =
        checks.every(
            check =>
                check.ready,
        );

    return {
        status:
            ready
                ? "ready"
                : "not_ready",

        checkedAt,

        lifecycleStatus:
            input.state.status,

        checks,
    };
}

// -----------------------------------------------------------------------------
// PROBE EXECUTION
// -----------------------------------------------------------------------------

async function executeProbe(
    probe:
    AccessReadinessProbe,
    timeoutMs:
    number,
): Promise<AccessReadinessCheckResult> {
    try {
        const result =
            await withTimeout(
                Promise.resolve(
                    probe.check(),
                ),
                timeoutMs,
                probe.name,
            );

        if (
            typeof result === "boolean"
        ) {
            return {
                name:
                    probe.name,

                ready:
                    result,
            };
        }

        return {
            name:
                probe.name,

            ready:
                result.ready,

            details:
                result.details,
        };
    } catch (
        error
    ) {
        return {
            name:
                probe.name,

            ready:
                false,

            error,
        };
    }
}

async function withTimeout<T>(
    operation:
    Promise<T>,
    timeoutMs:
    number,
    probeName:
    string,
): Promise<T> {
    let timer:
    ReturnType<typeof setTimeout>
    | undefined;

    const timeout =
        new Promise<never>(
            (
                _resolve,
                reject,
            ) => {
                timer =
                    setTimeout(
                        () => {
                            reject(
                                new Error(
                                    `Access readiness probe "${probeName}" timed out after ${timeoutMs} milliseconds.`,
                                ),
                            );
                        },
                        timeoutMs,
                    );
            },
        );

    try {
        return await Promise.race([
            operation,
            timeout,
        ]);
    } finally {
        if (
            timer !== undefined
        ) {
            clearTimeout(
                timer,
            );
        }
    }
}

// -----------------------------------------------------------------------------
// VALIDATION HELPERS
// -----------------------------------------------------------------------------

function validateProbes(
    probes:
    readonly AccessReadinessProbe[],
): void {
    const names =
        new Set<string>();

    for (
        const probe
        of probes
    ) {
        const name =
            normalizeName(
                probe.name,
                "Access readiness probe",
            );

        if (
            names.has(name)
        ) {
            throw new Error(
                `Access readiness probe "${name}" is registered more than once.`,
            );
        }

        names.add(name);
    }
}

function normalizeUniqueNames(
    values:
    readonly string[],
    label:
    string,
): readonly string[] {
    const names =
        new Set<string>();

    for (
        const value
        of values
    ) {
        const name =
            normalizeName(
                value,
                label,
            );

        if (
            names.has(name)
        ) {
            throw new Error(
                `${label} "${name}" is declared more than once.`,
            );
        }

        names.add(name);
    }

    return [...names];
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

function normalizeProbeTimeout(
    value: number,
): number {
    if (
        !Number.isSafeInteger(value)
        || value <= 0
    ) {
        throw new RangeError(
            "Access readiness probe timeout must be a positive safe integer.",
        );
    }

    return value;
}

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
