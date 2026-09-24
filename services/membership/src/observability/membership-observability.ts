// -----------------------------------------------------------------------------
// MEMBERSHIP OBSERVABILITY
// -----------------------------------------------------------------------------
// Membership-owned observability facade built on the host logger contract.
// Keeps business telemetry low-cardinality and guarantees sensitive values are
// never included in structured metadata.
// -----------------------------------------------------------------------------

import type { PlatformLogger } from "@folksdo-platform/runtime";

export type MembershipMetricName =
    | "membership_command_total"
    | "membership_command_failure_total"
    | "membership_transition_total"
    | "membership_context_switch_total"
    | "membership_context_switch_failure_total"
    | "membership_invitation_total"
    | "membership_invitation_expired_total"
    | "membership_reaction_total"
    | "membership_reaction_failure_total"
    | "membership_reaction_retry_total"
    | "membership_reaction_dlq_total"
    | "membership_outbox_pending"
    | "membership_outbox_lag_seconds";

export interface MembershipMetricLabels {
    readonly operation?: string;
    readonly outcome?: "success" | "failure" | "skipped";
    readonly status?: string;
    readonly reaction?: string;
    readonly failureClass?: "permanent" | "transient" | "authorization" | "validation";
}

export interface MembershipLogContext {
    readonly operation: string;
    readonly outcome: "started" | "succeeded" | "failed" | "skipped";
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly tenantId?: string;
    readonly identityId?: string;
    readonly membershipId?: string;
    readonly invitationId?: string;
    readonly failureCode?: string;
    readonly failureClass?: string;
}

export interface MembershipObservabilitySnapshot {
    readonly counters: Readonly<Record<string, number>>;
    readonly gauges: Readonly<Record<string, number>>;
}

export interface MembershipObservability {
    log(context: MembershipLogContext, message: string): void;
    increment(name: MembershipMetricName, labels?: MembershipMetricLabels, value?: number): void;
    gauge(name: MembershipMetricName, value: number, labels?: MembershipMetricLabels): void;
    snapshot(): MembershipObservabilitySnapshot;
}

export function createMembershipObservability(logger: PlatformLogger): MembershipObservability {
    const counters = new Map<string, number>();
    const gauges = new Map<string, number>();

    function key(name: MembershipMetricName, labels: MembershipMetricLabels = {}): string {
        const entries = Object.entries(labels)
            .filter(([, value]) => value !== undefined)
            .sort(([left], [right]) => left.localeCompare(right));
        return `${name}{${entries.map(([label, value]) => `${label}=${String(value)}`).join(",")}}`;
    }

    return {
        log(context, message): void {
            const metadata = {
                service: "membership",
                capability: "membership-operations",
                ...context,
            } as const;

            if (context.outcome === "failed") {
                logger.error(metadata, message);
                return;
            }
            if (context.outcome === "skipped") {
                logger.warn(metadata, message);
                return;
            }
            logger.info(metadata, message);
        },

        increment(name, labels = {}, value = 1): void {
            const metricKey = key(name, labels);
            counters.set(metricKey, (counters.get(metricKey) ?? 0) + value);
        },

        gauge(name, value, labels = {}): void {
            gauges.set(key(name, labels), value);
        },

        snapshot(): MembershipObservabilitySnapshot {
            return {
                counters: Object.fromEntries(counters),
                gauges: Object.fromEntries(gauges),
            };
        },
    };
}

export function assertMembershipTelemetrySafe(value: unknown): void {
    const serialized = JSON.stringify(value).toLowerCase();
    const forbidden = [
        "authorization",
        "bearer ",
        "invitationtoken",
        "tokenhash",
        "password",
        "secret",
        "sessiontoken",
    ];
    for (const fragment of forbidden) {
        if (serialized.includes(fragment)) {
            throw new Error(`Sensitive telemetry field detected: ${fragment}`);
        }
    }
}
