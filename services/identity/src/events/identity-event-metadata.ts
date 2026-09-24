// services/identity/src/events/identity-event-metadata.ts
// -----------------------------------------------------------------------------
// IDENTITY EVENT METADATA
// -----------------------------------------------------------------------------
// Shared event metadata for replayable Identity business facts.
// -----------------------------------------------------------------------------

export interface IdentityEventMetadata {
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly actorId?: string;
    readonly actorType?: string;
    readonly tenantId?: string;
    readonly tenantType?: string;
}
