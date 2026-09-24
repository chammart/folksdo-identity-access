// services/membership/src/reactions/membership-lifecycle-events.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP LIFECYCLE EVENTS
// -----------------------------------------------------------------------------
// External lifecycle facts consumed by Membership Operations™.
// -----------------------------------------------------------------------------

export interface IdentityArchivedPayload {
    readonly identityId: string;
    readonly reason?: string;
}

export interface TenantLifecyclePayload {
    readonly tenantId: string;
    readonly reason?: string;
}

export interface SubscriptionLifecyclePayload {
    readonly subscriptionId: string;
    readonly tenantId: string;
    readonly reason?: string;
}

export type MembershipLifecycleEvent =
    | {
        readonly eventType: "identity.identity.archived";
        readonly payload: IdentityArchivedPayload;
    }
    | {
        readonly eventType: "tenant.suspended";
        readonly payload: TenantLifecyclePayload;
    }
    | {
        readonly eventType: "tenant.archived";
        readonly payload: TenantLifecyclePayload;
    }
    | {
        readonly eventType: "subscription.suspended";
        readonly payload: SubscriptionLifecyclePayload;
    }
    | {
        readonly eventType: "subscription.reactivated";
        readonly payload: SubscriptionLifecyclePayload;
    };
