// services/access/src/observability/access-observability.ts
// -----------------------------------------------------------------------------
// ACCESS OBSERVABILITY
// -----------------------------------------------------------------------------
// Access-owned observability facade.
//
// Purpose:
//   • expose low-cardinality Access Operations™ telemetry
//   • keep business and application layers independent from logger providers
//   • prevent sensitive values from entering structured telemetry
//   • support deterministic observability assertions in tests
//
// Boundary:
//   • depends only on the Access-owned logger contract defined here
//   • does not import host runtime or infrastructure implementations
//   • does not publish metrics directly to an external provider
//   • never records credentials, tokens, secrets, or authorization headers
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ACCESS LOGGER CONTRACT
// -----------------------------------------------------------------------------

export interface AccessLogger {
    info(
        metadata: Readonly<Record<string, unknown>>,
        message: string,
    ): void;

    warn(
        metadata: Readonly<Record<string, unknown>>,
        message: string,
    ): void;

    error(
        metadata: Readonly<Record<string, unknown>>,
        message: string,
    ): void;
}

// -----------------------------------------------------------------------------
// ACCESS METRIC NAMES
// -----------------------------------------------------------------------------

export type AccessMetricName =
    | "access_command_total"
    | "access_command_failure_total"
    | "access_role_assignment_total"
    | "access_permission_assignment_total"
    | "access_authorization_decision_total"
    | "access_authorization_failure_total"
    | "access_policy_total"
    | "access_restriction_total"
    | "access_reaction_total"
    | "access_reaction_failure_total"
    | "access_reaction_retry_total"
    | "access_reaction_dlq_total"
    | "access_outbox_pending"
    | "access_outbox_lag_seconds";

// -----------------------------------------------------------------------------
// ACCESS METRIC LABELS
// -----------------------------------------------------------------------------

export interface AccessMetricLabels {
    readonly operation?: string;
    readonly outcome?: "success" | "failure" | "skipped";
    readonly status?: string;
    readonly scope?:
    | "platform"
    | "tenant"
    | "resource_type"
    | "resource_instance";
    readonly decision?: "allow" | "deny";
    readonly reaction?: string;
    readonly failureClass?:
    | "permanent"
    | "transient"
    | "authorization"
    | "validation";
}

// -----------------------------------------------------------------------------
// ACCESS LOG CONTEXT
// -----------------------------------------------------------------------------

export interface AccessLogContext {
    readonly operation: string;
    readonly outcome:
    | "started"
    | "succeeded"
    | "failed"
    | "skipped";
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly tenantId?: string;
    readonly identityId?: string;
    readonly membershipId?: string;
    readonly permissionId?: string;
    readonly roleId?: string;
    readonly assignmentId?: string;
    readonly policyId?: string;
    readonly restrictionId?: string;
    readonly decision?: "allow" | "deny";
    readonly reasonCode?: string;
    readonly failureCode?: string;
    readonly failureClass?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OBSERVABILITY SNAPSHOT
// -----------------------------------------------------------------------------

export interface AccessObservabilitySnapshot {
    readonly counters: Readonly<Record<string, number>>;
    readonly gauges: Readonly<Record<string, number>>;
}

// -----------------------------------------------------------------------------
// ACCESS OBSERVABILITY CONTRACT
// -----------------------------------------------------------------------------

export interface AccessObservability {
    log(
        context: AccessLogContext,
        message: string,
    ): void;

    increment(
        name: AccessMetricName,
        labels?: AccessMetricLabels,
        value?: number,
    ): void;

    gauge(
        name: AccessMetricName,
        value: number,
        labels?: AccessMetricLabels,
    ): void;

    snapshot(): AccessObservabilitySnapshot;
}

// -----------------------------------------------------------------------------
// ACCESS OBSERVABILITY FACTORY
// -----------------------------------------------------------------------------

export function createAccessObservability(
    logger: AccessLogger,
): AccessObservability {
    const counters = new Map<string, number>();
    const gauges = new Map<string, number>();

    function metricKey(
        name: AccessMetricName,
        labels: AccessMetricLabels = {},
    ): string {
        assertAccessTelemetrySafe(labels);

        const entries = Object.entries(labels)
            .filter(([, value]) => value !== undefined)
            .sort(([left], [right]) => left.localeCompare(right));

        const serializedLabels = entries
            .map(
                ([label, value]) =>
                    `${label}=${String(value)}`,
            )
            .join(",");

        return `${name}{${serializedLabels}}`;
    }

    return {
        log(
            context: AccessLogContext,
            message: string,
        ): void {
            const metadata: Readonly<Record<string, unknown>> = {
                service: "access",
                capability: "access-operations",
                ...context,
            };

            assertAccessTelemetrySafe(metadata);
            assertAccessTelemetrySafe(message);

            if (context.outcome === "failed") {
                logger.error(
                    metadata,
                    message,
                );

                return;
            }

            if (context.outcome === "skipped") {
                logger.warn(
                    metadata,
                    message,
                );

                return;
            }

            logger.info(
                metadata,
                message,
            );
        },

        increment(
            name: AccessMetricName,
            labels: AccessMetricLabels = {},
            value = 1,
        ): void {
            const key = metricKey(
                name,
                labels,
            );

            counters.set(
                key,
                (counters.get(key) ?? 0) + value,
            );
        },

        gauge(
            name: AccessMetricName,
            value: number,
            labels: AccessMetricLabels = {},
        ): void {
            gauges.set(
                metricKey(
                    name,
                    labels,
                ),
                value,
            );
        },

        snapshot(): AccessObservabilitySnapshot {
            return {
                counters: Object.freeze(
                    Object.fromEntries(counters),
                ),
                gauges: Object.freeze(
                    Object.fromEntries(gauges),
                ),
            };
        },
    };
}

// -----------------------------------------------------------------------------
// ACCESS TELEMETRY SAFETY
// -----------------------------------------------------------------------------

export function assertAccessTelemetrySafe(
    value: unknown,
): void {
    const serialized = JSON.stringify(value)
        .toLowerCase();

    const forbiddenFragments = [
        "authorizationheader",
        "authorization header",
        "bearer ",
        "accesstoken",
        "access token",
        "refreshtoken",
        "refresh token",
        "sessiontoken",
        "session token",
        "tokenhash",
        "token hash",
        "password",
        "secret",
    ] as const;

    for (const fragment of forbiddenFragments) {
        if (serialized.includes(fragment)) {
            throw new Error(
                `Sensitive telemetry field detected: ${fragment}`,
            );
        }
    }
}