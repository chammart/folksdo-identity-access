// services/membership/src/events/membership-events.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP EVENTS
// -----------------------------------------------------------------------------
// Replayable Membership event and outbox construction.
// -----------------------------------------------------------------------------

import type { OutboxMessage, ReplayableEvent, RuntimeContext } from "@folksdo-engine/runtime";
import { membershipEventMetadata } from "./membership-event-metadata";
export interface MembershipEventIdGenerator {
    createEventId(): string;
    createOutboxMessageId(): string;
}
export function createMembershipEvent(input: {
    readonly ids: MembershipEventIdGenerator;
    readonly context: RuntimeContext;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly eventType: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}): ReplayableEvent {
    return {
        eventId: input.ids.createEventId(),
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        version: 1,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: membershipEventMetadata(input.context),
    } as ReplayableEvent;
}
export function createMembershipOutboxMessage(input: {
    readonly ids: MembershipEventIdGenerator;
    readonly context: RuntimeContext;
    readonly subject: string;
    readonly occurredAt: string;
    readonly payload: Record<string, unknown>;
}): OutboxMessage {
    return {
        messageId: input.ids.createOutboxMessageId(),
        subject: input.subject,
        occurredAt: input.occurredAt,
        payload: input.payload,
        metadata: membershipEventMetadata(input.context),
    } as OutboxMessage;
}

