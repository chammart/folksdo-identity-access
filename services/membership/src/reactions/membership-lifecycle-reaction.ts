// services/membership/src/reactions/membership-lifecycle-reaction.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP LIFECYCLE REACTION
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { ApplyMembershipLifecycleReactionUseCase } from "../usecases";
import type { MembershipLifecycleEvent } from "./membership-lifecycle-events";

export interface MembershipLifecycleReaction {
    handle(event: MembershipLifecycleEvent, context: RuntimeContext): Promise<void>;
}

export function createMembershipLifecycleReaction(
    useCase: ApplyMembershipLifecycleReactionUseCase,
): MembershipLifecycleReaction {
    return {
        async handle(event, context): Promise<void> {
            switch (event.eventType) {
                case "identity.identity.archived":
                    await useCase.archiveIdentity(event.payload.identityId, event.payload.reason ?? "identity_archived", context);
                    return;
                case "tenant.suspended":
                    await useCase.suspendTenant(event.payload.tenantId, event.payload.reason ?? "tenant_suspended", context);
                    return;
                case "tenant.archived":
                    await useCase.archiveTenant(event.payload.tenantId, event.payload.reason ?? "tenant_archived", context);
                    return;
                case "subscription.suspended":
                    await useCase.suspendSubscription(event.payload.tenantId, event.payload.reason ?? "subscription_suspended", context);
                    return;
                case "subscription.reactivated":
                    await useCase.restoreSubscription(event.payload.tenantId, context);
                    return;
            }
        },
    };
}
