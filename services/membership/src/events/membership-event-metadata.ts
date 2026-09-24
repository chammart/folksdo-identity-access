// services/membership/src/events/membership-event-metadata.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP EVENT METADATA
// -----------------------------------------------------------------------------
// Replayable Membership event and outbox construction.
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";
export function membershipEventMetadata(context: RuntimeContext): Record<string, unknown> {
    return {
        requestId: context.requestId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        tenantId: context.tenant.tenantId,
        tenantType: context.tenant.tenantType,
    };
}

