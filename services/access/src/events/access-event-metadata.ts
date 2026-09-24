// services/access/src/events/access-event-metadata.ts
// -----------------------------------------------------------------------------
// ACCESS EVENT METADATA
// -----------------------------------------------------------------------------
// Canonical metadata attached to replayable Access events and outbox messages.
//
// Purpose:
//   • preserve request and distributed tracing context
//   • preserve the authenticated actor responsible for the operation
//   • preserve the tenant execution context
//   • keep event and outbox metadata construction consistent
//
// Boundary:
//   • derives metadata only from the Folksdo Engine runtime context
//   • contains no Access business state
//   • contains no transport-specific behavior
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";

// -----------------------------------------------------------------------------
// ACCESS EVENT METADATA CONTRACT
// -----------------------------------------------------------------------------

export interface AccessEventMetadata
    extends Readonly<Record<string, unknown>> {
    readonly requestId: string;
    readonly correlationId: string;
    readonly causationId?: string;
    readonly actorId: string;
    readonly actorType: string;
    readonly tenantId: string;
    readonly tenantType: string;
}

// -----------------------------------------------------------------------------
// ACCESS EVENT METADATA FACTORY
// -----------------------------------------------------------------------------

export function accessEventMetadata(
    context: RuntimeContext,
): AccessEventMetadata {
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