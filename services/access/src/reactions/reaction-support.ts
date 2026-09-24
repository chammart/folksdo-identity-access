// services/access/src/reactions/reaction-support.ts
// -----------------------------------------------------------------------------
// ACCESS REACTION SUPPORT
// -----------------------------------------------------------------------------
// Small shared helpers for Access Operations™ reaction handlers.
//
// Purpose:
//   • derive canonical Access reaction context from source event metadata
//   • parse and validate source-event occurrence timestamps
//   • provide narrow payload validation primitives
//
// Boundary:
//   • does not route events
//   • does not invoke use cases
//   • does not commit Access state
//   • does not implement transport acknowledgment or retry behavior
//   • must not become a generic reaction framework
// -----------------------------------------------------------------------------

import type {
    AccessReactionContext,
    AccessReactionEvent,
    AccessReactionEventMetadata,
} from "./access-reaction-contracts";

// -----------------------------------------------------------------------------
// REACTION SUPPORT ERRORS
// -----------------------------------------------------------------------------

export type AccessReactionSupportErrorCode =
    | "access_reaction_event_metadata_invalid"
    | "access_reaction_event_occurred_at_invalid"
    | "access_reaction_event_payload_invalid";

export class AccessReactionSupportError extends Error {
    public constructor(
        public readonly code: AccessReactionSupportErrorCode,
        message: string,
        options?: {
            readonly cause?: unknown;
        },
    ) {
        super(
            message,
            options,
        );

        this.name = new.target.name;
    }
}

export class AccessReactionEventMetadataInvalidError
    extends AccessReactionSupportError {
    public constructor(
        field: keyof AccessReactionEventMetadata,
    ) {
        super(
            "access_reaction_event_metadata_invalid",
            `Access reaction event metadata field "${field}" is invalid.`,
        );
    }
}

export class AccessReactionEventOccurredAtInvalidError
    extends AccessReactionSupportError {
    public constructor(
        occurredAt: string,
    ) {
        super(
            "access_reaction_event_occurred_at_invalid",
            `Access reaction event occurredAt value "${occurredAt}" is invalid.`,
        );
    }
}

export class AccessReactionEventPayloadInvalidError
    extends AccessReactionSupportError {
    public constructor(
        message: string,
    ) {
        super(
            "access_reaction_event_payload_invalid",
            message,
        );
    }
}

// -----------------------------------------------------------------------------
// STRING VALIDATION
// -----------------------------------------------------------------------------

/**
 * Returns a trimmed non-empty string or throws a stable reaction error.
 */
export function requireReactionString(
    value: unknown,
    field: string,
): string {
    if (
        typeof value !== "string"
        || value.trim().length === 0
    ) {
        throw new AccessReactionEventPayloadInvalidError(
            `Access reaction event payload field "${field}" must be a non-empty string.`,
        );
    }

    return value.trim();
}

/**
 * Returns an optional trimmed string.
 *
 * Empty strings are normalized to undefined.
 */
export function optionalReactionString(
    value: unknown,
    field: string,
): string | undefined {
    if (
        value === undefined
        || value === null
        || value === ""
    ) {
        return undefined;
    }

    if (
        typeof value !== "string"
    ) {
        throw new AccessReactionEventPayloadInvalidError(
            `Access reaction event payload field "${field}" must be a string when provided.`,
        );
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : undefined;
}

// -----------------------------------------------------------------------------
// PAYLOAD VALIDATION
// -----------------------------------------------------------------------------

/**
 * Ensures that an external event payload is a non-array object.
 *
 * Event-specific reactions remain responsible for validating their required
 * fields.
 */
export function requireReactionPayloadObject(
    payload: unknown,
): Readonly<Record<string, unknown>> {
    if (
        payload === null
        || typeof payload !== "object"
        || Array.isArray(payload)
    ) {
        throw new AccessReactionEventPayloadInvalidError(
            "Access reaction event payload must be an object.",
        );
    }

    return payload as Readonly<Record<string, unknown>>;
}

// -----------------------------------------------------------------------------
// EVENT OCCURRENCE TIME
// -----------------------------------------------------------------------------

/**
 * Parses the source event occurrence time.
 *
 * Reactions should use the source business-event time for source-fact state
 * transitions and the injected reaction clock only when the local execution
 * time is specifically required.
 */
export function reactionEventOccurredAt(
    event: AccessReactionEvent,
): Date {
    const occurredAt =
        event.metadata.occurredAt;

    const parsed =
        new Date(occurredAt);

    if (
        occurredAt.trim().length === 0
        || Number.isNaN(parsed.getTime())
    ) {
        throw new AccessReactionEventOccurredAtInvalidError(
            occurredAt,
        );
    }

    return parsed;
}

// -----------------------------------------------------------------------------
// REACTION CONTEXT
// -----------------------------------------------------------------------------

/**
 * Builds canonical Access execution context from source event metadata.
 *
 * Fallback rules:
 *   • requestId falls back to the source event identifier
 *   • correlationId falls back to requestId
 *   • causationId is always the consumed source event identifier
 *
 * Any Access events emitted by the invoked use case therefore remain traceable
 * to the external event that caused the reaction.
 */
export function buildAccessReactionContext(
    event: AccessReactionEvent,
): AccessReactionContext {
    const eventId =
        requireMetadataString(
            event.metadata.eventId,
            "eventId",
        );

    const subject =
        requireMetadataString(
            event.metadata.subject,
            "subject",
        );

    const source =
        requireMetadataString(
            event.metadata.source,
            "source",
        );

    const requestId =
        normalizeOptionalMetadataString(
            event.metadata.requestId,
        )
        ?? eventId;

    const correlationId =
        normalizeOptionalMetadataString(
            event.metadata.correlationId,
        )
        ?? requestId;

    return {
        requestId,
        correlationId,
        causationId: eventId,
        sourceEventId: eventId,
        sourceEventSubject: subject,
        sourceService: source,
    };
}

// -----------------------------------------------------------------------------
// INTERNAL METADATA SUPPORT
// -----------------------------------------------------------------------------

function requireMetadataString(
    value: string,
    field: keyof AccessReactionEventMetadata,
): string {
    const normalized =
        value.trim();

    if (
        normalized.length === 0
    ) {
        throw new AccessReactionEventMetadataInvalidError(
            field,
        );
    }

    return normalized;
}

function normalizeOptionalMetadataString(
    value: string | undefined,
): string | undefined {
    if (
        value === undefined
    ) {
        return undefined;
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : undefined;
}

/**
 * Returns a validated array of normalized, unique and deterministically sorted
 * non-empty strings.
 *
 * Empty arrays are valid.
 */
export function requireReactionStringArray(
    value: unknown,
    field: string,
): readonly string[] {
    if (
        !Array.isArray(
            value,
        )
    ) {
        throw new AccessReactionEventPayloadInvalidError(
            `Access reaction event payload field "${field}" must be an array.`,
        );
    }

    const normalized =
        value.map(
            (
                item,
                index,
            ) =>
                requireReactionString(
                    item,
                    `${field}[${index}]`,
                ),
        );

    return [
        ...new Set(
            normalized,
        ),
    ].sort(
        (
            left,
            right,
        ) =>
            left.localeCompare(
                right,
            ),
    );
}