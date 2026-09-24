// services/identity/src/runtime/register-identity-reactions.ts
// -----------------------------------------------------------------------------
// REGISTER IDENTITY REACTIONS
// -----------------------------------------------------------------------------
// Wires Identity Service™ reactions into Folksdo Processing Reaction Runtime™.
//
// Purpose:
//   • subscribe Identity reactions to external Membership invitation events
//   • keep Identity decoupled from NATS, JetStream, and broker infrastructure
//   • route Processing reaction messages into Identity's reaction dispatcher
//   • complete event-choreographed invitation verification
//
// Architectural rules:
//
//   • Identity does not connect to NATS directly
//   • Identity does not own broker subscriptions
//   • Processing owns delivery, retry, and dead-letter behavior
//   • Identity owns business reaction behavior only
// -----------------------------------------------------------------------------

import type { PlatformRuntime } from "@folksdo-platform/runtime";

import type {
    IdentityRuntime,
} from "./identity-runtime";

import type {
    MembershipInvitationLifecycleEvent,
} from "../reactions";

// -----------------------------------------------------------------------------
// SUBJECTS
// -----------------------------------------------------------------------------

const membershipInvitationSubjects = [
    "membership.invitation.created",
    "membership.invitation.expired",
    "membership.invitation.revoked",
    "membership.invitation.redeemed",
] as const;

type MembershipInvitationSubject =
    typeof membershipInvitationSubjects[number];

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface RegisterIdentityReactionsInput {
    readonly platformRuntime: PlatformRuntime;

    readonly identityRuntime: IdentityRuntime;
}

// -----------------------------------------------------------------------------
// REGISTRATION
// -----------------------------------------------------------------------------

export function registerIdentityReactions(
    input: RegisterIdentityReactionsInput,
): void {
    input.platformRuntime.processing.processing.reactions.register({
        reactionName: "identity-known-invitation-reactions",
        subjects: membershipInvitationSubjects,
        async handler({ message }): Promise<void> {
            const event = toMembershipInvitationLifecycleEvent({
                subject: message.subject,
                payload: message.payload,
                occurredAt: message.receivedAt,
            });

            await input.identityRuntime.reactions
                .handleMembershipInvitationEvent(event);
        },
    });
}

// -----------------------------------------------------------------------------
// EVENT MAPPING
// -----------------------------------------------------------------------------

function toMembershipInvitationLifecycleEvent(input: {
    readonly subject: string;

    readonly payload: Readonly<Record<string, unknown>>;

    readonly occurredAt: string;
}): MembershipInvitationLifecycleEvent {
    if (!isMembershipInvitationSubject(input.subject)) {
        throw new Error(
            `Unsupported Identity reaction subject: ${input.subject}`,
        );
    }

    switch (input.subject) {
        case "membership.invitation.created": {
            return {
                eventType: input.subject,
                occurredAt: resolveOccurredAt(input),
                payload: {
                    invitationId: requireString(
                        input.payload,
                        "invitationId",
                    ),
                    targetTenantId: requireString(
                        input.payload,
                        "targetTenantId",
                    ),
                    invitedEmail: requireString(
                        input.payload,
                        "invitedEmail",
                    ),
                    invitationTokenHash: requireString(
                        input.payload,
                        "invitationTokenHash",
                    ),
                    expiresAt: requireString(
                        input.payload,
                        "expiresAt",
                    ),
                },
            };
        }

        case "membership.invitation.expired":
        case "membership.invitation.revoked":
        case "membership.invitation.redeemed": {
            return {
                eventType: input.subject,
                occurredAt: resolveOccurredAt(input),
                payload: {
                    invitationId: requireString(
                        input.payload,
                        "invitationId",
                    ),
                },
            };
        }
    }
}

function isMembershipInvitationSubject(
    subject: string,
): subject is MembershipInvitationSubject {
    return membershipInvitationSubjects.includes(
        subject as MembershipInvitationSubject,
    );
}

function resolveOccurredAt(input: {
    readonly payload: Readonly<Record<string, unknown>>;

    readonly occurredAt: string;
}): string {
    const occurredAt = input.payload.occurredAt;

    if (typeof occurredAt === "string" && occurredAt.trim().length > 0) {
        return occurredAt;
    }

    return input.occurredAt;
}

function requireString(
    payload: Readonly<Record<string, unknown>>,
    field: string,
): string {
    const value = payload[field];

    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(
            `Invalid Membership invitation reaction payload. Missing field: ${field}`,
        );
    }

    return value;
}
