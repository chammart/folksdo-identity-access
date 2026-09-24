// services/access/src/usecases/authorization-lifecycle/apply-subscription-capabilities-usecase.ts
// -----------------------------------------------------------------------------
// APPLY SUBSCRIPTION CAPABILITIES USE CASE
// -----------------------------------------------------------------------------
// Applies Subscription commercial facts used by Access Operations™ during
// authorization evaluation.
//
// Boundary:
//   • records Access-owned knowledge of Subscription commercial eligibility
//   • preserves previously known values when lifecycle-only events arrive
//   • delegates deterministic state construction to business rules
//   • commits the Known Subscription Capability fact atomically
//
// This use case does not own:
//   • Subscription lifecycle
//   • commercial Entitlement calculation
//   • billing state
//   • Tenant lifecycle
//   • Permission assignment lifecycle
// -----------------------------------------------------------------------------

import {
    applyKnownSubscriptionCapabilities,
} from "../../business-rules";

import type {
    KnownSubscriptionStatus,
} from "../../known-facts";

import type {
    AccessStateChange,
    AccessUseCaseDependencies,
} from "../shared";

import {
    commitLifecycle,
    knownFactChange,
} from "./lifecycle-support";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface ApplySubscriptionCapabilitiesUseCaseRequest {
    readonly tenantId: string;

    readonly subscriptionId: string;

    readonly status?: KnownSubscriptionStatus;

    /**
     * Complete desired commercial capability set when supplied.
     *
     * Lifecycle-only events may omit this value, in which case Access preserves
     * the previously known capability set.
     */
    readonly capabilities?: readonly string[];

    readonly effectiveAt?: string;

    readonly expiresAt?: string;

    readonly sourceReference?: string;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ApplySubscriptionCapabilitiesUseCaseResult {
    readonly tenantId: string;

    readonly subscriptionId: string;

    readonly status: KnownSubscriptionStatus;

    readonly capabilities: readonly string[];

    readonly changed: boolean;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class ApplySubscriptionCapabilitiesUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request:
            ApplySubscriptionCapabilitiesUseCaseRequest,
    ): Promise<ApplySubscriptionCapabilitiesUseCaseResult> {
        const now =
            this.dependencies.clock.now();

        const currentSubscriptionCapabilities =
            await this.dependencies.readStore
                .findKnownSubscriptionCapabilities(
                    request.tenantId,
                );

        const status =
            request.status
            ?? currentSubscriptionCapabilities?.status;

        if (
            status === undefined
        ) {
            throw new Error(
                "Subscription commercial status is required when no known Subscription status exists.",
            );
        }

        const capabilities =
            request.capabilities
            ?? currentSubscriptionCapabilities?.capabilities
            ?? [];

        const effectiveAt =
            request.effectiveAt
            ?? currentSubscriptionCapabilities?.effectiveAt
            ?? now;

        const nextSubscriptionCapabilities =
            applyKnownSubscriptionCapabilities({
                current:
                    currentSubscriptionCapabilities,

                tenantId:
                    request.tenantId,

                subscriptionId:
                    request.subscriptionId,

                status,

                capabilities,

                effectiveAt,

                expiresAt:
                    request.expiresAt
                    ?? currentSubscriptionCapabilities?.expiresAt,

                now,
            });

        const stateChanges:
            AccessStateChange[] = [];

        const subscriptionCapabilitiesStateChange =
            knownFactChange(
                this.dependencies.collections
                    .knownSubscriptionCapabilities,

                request.tenantId,

                currentSubscriptionCapabilities,

                nextSubscriptionCapabilities,
            );

        if (
            subscriptionCapabilitiesStateChange
        ) {
            stateChanges.push(
                subscriptionCapabilitiesStateChange,
            );
        }

        const changed =
            await commitLifecycle({
                dependencies:
                    this.dependencies,

                aggregateType:
                    "access.subscription-capabilities",

                aggregateId:
                    request.tenantId,

                eventType:
                    "access.subscription_capabilities.applied",

                subject:
                    this.dependencies.outboxSubjects
                        .subscriptionCapabilitiesApplied,

                now,

                payload: {
                    tenantId:
                        request.tenantId,

                    subscriptionId:
                        request.subscriptionId,

                    status:
                        nextSubscriptionCapabilities.status,

                    capabilities:
                        nextSubscriptionCapabilities.capabilities,

                    effectiveAt:
                        nextSubscriptionCapabilities.effectiveAt,

                    expiresAt:
                        nextSubscriptionCapabilities.expiresAt,

                    sourceReference:
                        request.sourceReference,

                    occurredAt:
                        now,
                },

                stateChanges,
            });

        return {
            tenantId:
                request.tenantId,

            subscriptionId:
                request.subscriptionId,

            status:
                nextSubscriptionCapabilities.status,

            capabilities:
                nextSubscriptionCapabilities.capabilities,

            changed,
        };
    }
}