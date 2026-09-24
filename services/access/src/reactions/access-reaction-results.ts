// services/access/src/reactions/access-reaction-results.ts
// -----------------------------------------------------------------------------
// ACCESS REACTION RESULTS
// -----------------------------------------------------------------------------
// Stable outcomes returned by Access Operations™ reaction handlers.
//
// Purpose:
//   • provide a transport-neutral reaction result model
//   • distinguish processed events from intentionally ignored events
//   • expose whether the reaction changed canonical Access state
//   • keep acknowledgment and retry behavior outside reaction handlers
//
// Boundary:
//   • contains no NATS or JetStream types
//   • contains no worker acknowledgment behavior
//   • contains no persistence implementation
//   • contains no Access business rules
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PROCESSED RESULT
// -----------------------------------------------------------------------------

/**
 * Indicates that the incoming business event was recognized and processed.
 *
 * A processed reaction may legitimately produce no Access state change when:
 *   • the desired state already exists
 *   • the source event is replayed
 *   • the invoked use case determines that no transition is required
 */
export interface AccessReactionProcessedResult {
    readonly status: "processed";

    /**
     * Indicates whether canonical Access state changed.
     */
    readonly changed: boolean;
}

// -----------------------------------------------------------------------------
// IGNORED RESULT
// -----------------------------------------------------------------------------

/**
 * Indicates that the incoming event was intentionally not processed.
 *
 * Ignored results represent expected reaction behavior and must not be treated
 * as transport failures.
 */
export interface AccessReactionIgnoredResult {
    readonly status: "ignored";

    /**
     * Stable machine-readable reason explaining why the event was ignored.
     */
    readonly reason: AccessReactionIgnoredReason;
}

/**
 * Stable reasons for intentionally ignoring an incoming event.
 */
export type AccessReactionIgnoredReason =
    | "event_not_applicable"
    | "event_payload_incomplete"
    | "event_subject_unsupported"
    | "source_state_stale";

// -----------------------------------------------------------------------------
// REACTION RESULT
// -----------------------------------------------------------------------------

/**
 * Transport-neutral result returned by every Access reaction handler.
 */
export type AccessReactionResult =
    | AccessReactionProcessedResult
    | AccessReactionIgnoredResult;

// -----------------------------------------------------------------------------
// RESULT FACTORIES
// -----------------------------------------------------------------------------

/**
 * Creates a processed reaction result.
 */
export function accessReactionProcessed(
    changed: boolean,
): AccessReactionProcessedResult {
    return {
        status: "processed",
        changed,
    };
}

/**
 * Creates an ignored reaction result.
 */
export function accessReactionIgnored(
    reason: AccessReactionIgnoredReason,
): AccessReactionIgnoredResult {
    return {
        status: "ignored",
        reason,
    };
}