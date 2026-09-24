// services/access/src/events/access-events.ts
// -----------------------------------------------------------------------------
// ACCESS EVENTS
// -----------------------------------------------------------------------------
// Replayable Access event and outbox message construction.
//
// Purpose:
//   • construct canonical replayable Access business events
//   • construct canonical Access outbox messages
//   • preserve shared metadata and identifier generation
//   • keep event creation deterministic and infrastructure-neutral
//
// Boundary:
//   • does not define Access business event vocabulary
//   • does not persist or publish events
//   • does not perform business validation
//   • does not generate identifiers directly
// -----------------------------------------------------------------------------

import type {
    OutboxMessage,
    ReplayableEvent,
    RuntimeContext,
} from "@folksdo-engine/runtime";

import { accessEventMetadata } from "./access-event-metadata";

// -----------------------------------------------------------------------------
// ACCESS EVENT IDENTIFIER GENERATOR
// -----------------------------------------------------------------------------

export interface AccessEventIdGenerator {
    createEventId(): string;
    createOutboxMessageId(): string;
}

// -----------------------------------------------------------------------------
// ACCESS EVENT INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessEventInput {
    readonly ids: AccessEventIdGenerator;
    readonly context: RuntimeContext;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly eventType: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// ACCESS OUTBOX MESSAGE INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessOutboxMessageInput {
    readonly ids: AccessEventIdGenerator;
    readonly context: RuntimeContext;
    readonly subject: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// ACCESS EVENT FACTORY
// -----------------------------------------------------------------------------

export function createAccessEvent(
    input: CreateAccessEventInput,
): ReplayableEvent {
    const event: ReplayableEvent = {
        eventId: input.ids.createEventId(),
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        version: 1,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: accessEventMetadata(input.context),
    };

    return event;
}

// -----------------------------------------------------------------------------
// ACCESS OUTBOX MESSAGE FACTORY
// -----------------------------------------------------------------------------

export function createAccessOutboxMessage(
    input: CreateAccessOutboxMessageInput,
): OutboxMessage {
    const message: OutboxMessage = {
        messageId: input.ids.createOutboxMessageId(),
        subject: input.subject,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: accessEventMetadata(input.context),
    };

    return message;
}