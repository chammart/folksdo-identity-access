// services/access/src/runtime/composition/compose-access-reactions.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS REACTIONS
// -----------------------------------------------------------------------------
// Runtime composition for Access Operations™ inbound event reactions.
//
// Purpose:
//   • compose subject-specific Access reaction handlers
//   • expose one provider-neutral dispatch surface
//   • preserve replayable external-event routing
//
// Boundary:
//   • does not subscribe to a transport
//   • does not own retry, acknowledgment or dead-letter behavior
//   • does not construct event-specific reaction handlers
//   • contains no Access business behavior
// -----------------------------------------------------------------------------

import type {
    AccessReactionEvent,
    AccessReactionHandler,
    AccessReactionResult,
} from "../../reactions";

// -----------------------------------------------------------------------------
// REGISTRATION
// -----------------------------------------------------------------------------

export interface AccessReactionRegistration {
    readonly subject:
    string;

    readonly handler:
    AccessReactionHandler;
}

// -----------------------------------------------------------------------------
// DISPATCHER
// -----------------------------------------------------------------------------

export interface AccessReactionDispatcher {
    readonly subjects:
    readonly string[];

    handle(
        event: AccessReactionEvent,
    ): Promise<AccessReactionResult>;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessReactionsInput {
    readonly registrations:
    readonly AccessReactionRegistration[];
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessReactions(
    input:
    ComposeAccessReactionsInput,
): AccessReactionDispatcher {
    const handlers =
        new Map<string, AccessReactionHandler>();

    for (
        const registration
        of input.registrations
    ) {
        const subject =
            registration.subject.trim();

        if (
            subject.length === 0
        ) {
            throw new Error(
                "Access reaction subject must be a non-empty string.",
            );
        }

        if (
            handlers.has(subject)
        ) {
            throw new Error(
                `Access reaction subject "${subject}" is registered more than once.`,
            );
        }

        handlers.set(
            subject,
            registration.handler,
        );
    }

    const subjects =
        [...handlers.keys()].sort(
            (
                left,
                right,
            ) =>
                left.localeCompare(right),
        );

    return {
        subjects,

        async handle(
            event,
        ): Promise<AccessReactionResult> {
            const handler =
                handlers.get(
                    event.metadata.subject,
                );

            if (
                handler === undefined
            ) {
                throw new Error(
                    `No Access reaction is registered for subject "${event.metadata.subject}".`,
                );
            }

            return handler.handle(event);
        },
    };
}
