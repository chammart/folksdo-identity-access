// services/access/src/reactions/access-reaction-contracts.ts
// -----------------------------------------------------------------------------
// ACCESS REACTION CONTRACTS
// -----------------------------------------------------------------------------
// Shared transport-neutral contracts for Access Operations™ reactions.
//
// Purpose:
//   • define the canonical external event envelope consumed by reactions
//   • define stable reaction execution context
//   • define the common Access reaction handler contract
//   • preserve separation between reactions and transport workers
//
// Boundary:
//   • contains no NATS or JetStream types
//   • contains no acknowledgment or retry behavior
//   • contains no persistence implementation
//   • contains no event routing implementation
//   • contains no Access business rules
//
// Dependency direction:
//
//   External event worker
//          ↓
//   AccessReactionHandler
//          ↓
//   Access use case
//          ↓
//   Access business rules and commit boundary
// -----------------------------------------------------------------------------

import type {
    AccessReactionResult,
} from "./access-reaction-results";

// -----------------------------------------------------------------------------
// REACTION CLOCK
// -----------------------------------------------------------------------------

/**
 * Provides the current execution time to reaction handlers.
 *
 * Runtime composition supplies the production clock. Tests may supply a
 * deterministic implementation.
 */
export interface AccessReactionClock {
    now(): Date;
}

// -----------------------------------------------------------------------------
// EXTERNAL EVENT METADATA
// -----------------------------------------------------------------------------

/**
 * Provider-neutral metadata carried by an external replayable business event.
 */
export interface AccessReactionEventMetadata {
    /**
     * Stable identifier of the consumed source event.
     */
    readonly eventId: string;

    /**
     * Source event subject.
     *
     * Example:
     *   tenant.created
     */
    readonly subject: string;

    /**
     * Source service that emitted the event.
     */
    readonly source: string;

    /**
     * Source event schema version.
     */
    readonly version: number;

    /**
     * Time at which the source business event occurred.
     */
    readonly occurredAt: string;

    /**
     * Original request identifier when available.
     */
    readonly requestId?: string;

    /**
     * Correlation identifier shared across the business workflow.
     */
    readonly correlationId?: string;

    /**
     * Identifier of the event or command that caused the source event.
     */
    readonly causationId?: string;
}

// -----------------------------------------------------------------------------
// EXTERNAL EVENT
// -----------------------------------------------------------------------------

/**
 * Transport-neutral replayable business event consumed by Access reactions.
 *
 * The generic payload remains owned by the source service. Individual reaction
 * files define and validate the payload shape required for their source event.
 */
export interface AccessReactionEvent<
    TPayload = unknown,
> {
    readonly metadata: AccessReactionEventMetadata;

    readonly payload: TPayload;
}

// -----------------------------------------------------------------------------
// REACTION EXECUTION CONTEXT
// -----------------------------------------------------------------------------

/**
 * Canonical context passed from an external event into an Access use case.
 *
 * The context preserves traceability without exposing transport-owned message
 * types to the Access application layer.
 */
export interface AccessReactionContext {
    /**
     * Original request identifier when available.
     *
     * When absent from the source event, reaction support derives a stable
     * fallback from the event identifier.
     */
    readonly requestId: string;

    /**
     * Correlation identifier for the wider business workflow.
     */
    readonly correlationId: string;

    /**
     * The consumed external event becomes the causation of any Access events
     * emitted by the invoked use case.
     */
    readonly causationId: string;

    /**
     * Stable consumed source event identifier.
     */
    readonly sourceEventId: string;

    /**
     * Consumed source event subject.
     */
    readonly sourceEventSubject: string;

    /**
     * Source service that emitted the event.
     */
    readonly sourceService: string;
}

// -----------------------------------------------------------------------------
// REACTION HANDLER
// -----------------------------------------------------------------------------

/**
 * Common Access reaction handler contract.
 *
 * Reactions must:
 *   • react to one specific external business event
 *   • validate only the payload fields required by that event
 *   • translate the event into one existing Access use-case request
 *   • return a transport-neutral AccessReactionResult
 *
 * Reactions must not:
 *   • acknowledge or reject transport messages
 *   • implement retry or dead-letter behavior
 *   • duplicate Access business rules
 *   • commit state directly
 */
export interface AccessReactionHandler<
    TPayload = unknown,
> {
    handle(
        event: AccessReactionEvent<TPayload>,
    ): Promise<AccessReactionResult>;
}

// -----------------------------------------------------------------------------
// REACTION FACTORY DEPENDENCIES
// -----------------------------------------------------------------------------

/**
 * Shared dependencies available to reaction factories.
 *
 * Event-specific use-case dependencies belong in the corresponding reaction
 * factory input rather than in this common contract.
 */
export interface AccessReactionDependencies {
    readonly clock: AccessReactionClock;
}