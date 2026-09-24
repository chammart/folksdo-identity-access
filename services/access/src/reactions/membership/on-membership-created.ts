// services/access/src/reactions/membership/on-membership-created.ts
// -----------------------------------------------------------------------------
// ON MEMBERSHIP CREATED
// -----------------------------------------------------------------------------
// Reacts to the Membership Operations™ membership-created business event.
//
// Trigger:
//   membership.membership.created
//
// Purpose:
//   • record the Membership as an Access-known business fact
//   • preserve Membership Operations™ ownership of tenant participation
//   • establish the Identity-to-Tenant relationship required by authorization
//   • support deterministic replay and idempotent processing
//
// Boundary:
//   • does not create or activate the Membership
//   • does not resolve active Membership context
//   • does not create Access assignments
//   • does not manipulate persistence directly
//   • invokes an Access-owned application operation
// -----------------------------------------------------------------------------

import type {
    AccessReactionContext,
    AccessReactionEvent,
    AccessReactionHandler,
} from "../access-reaction-contracts";

import {
    accessReactionIgnored,
    accessReactionProcessed,
    type AccessReactionResult,
} from "../access-reaction-results";

import {
    buildAccessReactionContext,
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const membershipCreatedSubject =
    "membership.membership.created";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

/**
 * Membership-owned event payload consumed by Access Operations™.
 *
 * Access consumes only the identifiers required to maintain its local
 * Known Membership fact.
 */
export interface MembershipCreatedPayload {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface RecordKnownMembershipRequest {
    readonly membershipId: string;

    readonly identityId: string;

    readonly tenantId: string;

    readonly status: "pending";

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface RecordKnownMembershipResult {
    /**
     * Indicates whether the Access-known Membership fact changed.
     */
    readonly changed: boolean;
}

/**
 * Narrow contract satisfied by the corresponding Access use case during
 * runtime composition.
 */
export interface RecordKnownMembershipOperation {
    execute(
        request: RecordKnownMembershipRequest,
    ): Promise<RecordKnownMembershipResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnMembershipCreatedReactionInput {
    readonly recordKnownMembership:
    RecordKnownMembershipOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnMembershipCreatedReaction(
    input: CreateOnMembershipCreatedReactionInput,
): AccessReactionHandler<MembershipCreatedPayload> {
    const {
        recordKnownMembership,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<MembershipCreatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== membershipCreatedSubject
            ) {
                return accessReactionIgnored(
                    "event_subject_unsupported",
                );
            }

            const payload =
                requireReactionPayloadObject(
                    event.payload,
                );

            const membershipId =
                requireReactionString(
                    payload.membershipId,
                    "membershipId",
                );

            const identityId =
                requireReactionString(
                    payload.identityId,
                    "identityId",
                );

            const tenantId =
                requireReactionString(
                    payload.tenantId,
                    "tenantId",
                );

            const result =
                await recordKnownMembership.execute({
                    membershipId,
                    identityId,
                    tenantId,

                    status:
                        "pending",

                    occurredAt:
                        reactionEventOccurredAt(
                            event,
                        ),

                    context:
                        buildAccessReactionContext(
                            event,
                        ),
                });

            return accessReactionProcessed(
                result.changed,
            );
        },
    };
}