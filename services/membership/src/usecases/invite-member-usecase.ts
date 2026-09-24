// services/membership/src/usecases/invite-member-usecase.ts
// -----------------------------------------------------------------------------
// INVITE MEMBER USE CASE
// -----------------------------------------------------------------------------
// Production business orchestration for Invite Member™.
//
// Purpose:
//   • normalize the invited email address
//   • generate a cryptographically secure invitation token
//   • persist only the invitation token hash
//   • create canonical Membership-owned invitation state
//   • prepare the replayable invitation-created event
//   • prepare the matching outbox message
//   • commit state, event, and outbox atomically through Folksdo Engine™
//
// Security:
//   • the raw invitation token is returned only once
//   • the raw invitation token is never persisted
//   • the token hash is not published in event or outbox payloads
// -----------------------------------------------------------------------------

import {
    randomBytes,
} from "node:crypto";

import type {
    RuntimeContext,
    StateChange,
} from "@folksdo-engine/runtime";

import type {
    InvitationResult,
    InviteMemberRequest,
} from "../api";

import {
    hashInvitationToken,
    normalizeInvitationEmail,
} from "../business-rules";

import {
    createMembershipEvent,
    createMembershipOutboxMessage,
} from "../events";

import type {
    InvitationState,
} from "../state";

import {
    commitMembership,
} from "./membership-commit";

import type {
    MembershipMutationDependencies,
} from "./membership-usecase-contracts";

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface InviteMemberResult extends InvitationResult {
    /**
     * Raw invitation token returned only at creation time.
     *
     * This value must never be persisted or emitted through the event backbone.
     */
    readonly invitationToken?: string;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface InviteMemberUseCaseDependencies
    extends MembershipMutationDependencies {
    readonly defaultInvitationTtlMilliseconds: number;
}

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface InviteMemberUseCase {
    execute(
        input: InviteMemberRequest,
        context: RuntimeContext,
    ): Promise<InviteMemberResult>;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createInviteMemberUseCase(
    dependencies: InviteMemberUseCaseDependencies,
): InviteMemberUseCase {
    return {
        async execute(
            input: InviteMemberRequest,
            context: RuntimeContext,
        ): Promise<InviteMemberResult> {
            const now =
                dependencies.clock.nowTimestamp();

            const invitedEmail =
                normalizeInvitationEmail(input.invitedEmail);

            // Deterministic duplicate policy: one live pending invitation per
            // normalized tenant/email pair. Existing invitations are returned
            // safely without re-exposing their historical raw token.
            const existing = await dependencies.readStore.findPendingInvitation(
                input.tenantId, invitedEmail,
            );
            if (existing && Date.parse(existing.expiresAt) > Date.parse(now)) {
                return {
                    invitationId: existing.invitationId, targetTenantId: existing.targetTenantId,
                    invitedEmail: existing.invitedEmail, membershipType: existing.membershipType,
                    status: existing.status, createdAt: existing.createdAt, updatedAt: existing.updatedAt,
                    expiresAt: existing.expiresAt, redeemedAt: existing.redeemedAt,
                    revokedAt: existing.revokedAt, expiredAt: existing.expiredAt,
                };
            }

            const invitationId = dependencies.ids.createInvitationId();
            const invitationToken = randomBytes(32).toString("base64url");

            const invitationTokenHash =
                hashInvitationToken(
                    invitationToken,
                );

            const invitationTtlMilliseconds =
                input.expiresInMilliseconds
                ?? dependencies.defaultInvitationTtlMilliseconds;

            const expiresAt = new Date(
                Date.parse(now)
                + invitationTtlMilliseconds,
            ).toISOString();

            const invitation: InvitationState = {
                invitationId,

                targetTenantId:
                    input.tenantId,

                invitedEmail,

                invitationTokenHash,

                membershipType:
                    input.membershipType,

                status:
                    "pending",

                expiresAt,

                invitedBy:
                    context.actor.actorId,

                createdAt:
                    now,

                updatedAt:
                    now,
            };

            // -----------------------------------------------------------------------------
            // INVITATION EVENT PAYLOAD
            // -----------------------------------------------------------------------------
            // The raw invitation token is never persisted or published.
            //
            // The deterministic token hash is included because downstream autonomous
            // services use it to correlate the invitation without receiving the secret
            // token itself.
            // -----------------------------------------------------------------------------

            const payload = {
                invitationId:
                    invitation.invitationId,

                targetTenantId:
                    invitation.targetTenantId,

                invitedEmail:
                    invitation.invitedEmail,

                invitationTokenHash:
                    invitation.invitationTokenHash,

                membershipType:
                    invitation.membershipType,

                status:
                    invitation.status,

                expiresAt:
                    invitation.expiresAt,

                invitedBy:
                    invitation.invitedBy,

                createdAt:
                    invitation.createdAt,

                occurredAt:
                    now,
            };

            const stateChanges: StateChange[] = [
                {
                    operation: "insert",

                    collection:
                        dependencies
                            .collections
                            .invitations,

                    document: {
                        invitationId:
                            invitation.invitationId,

                        targetTenantId:
                            invitation.targetTenantId,

                        invitedEmail:
                            invitation.invitedEmail,

                        invitationTokenHash:
                            invitation.invitationTokenHash,

                        membershipType:
                            invitation.membershipType,

                        status:
                            invitation.status,

                        expiresAt:
                            invitation.expiresAt,

                        invitedBy:
                            invitation.invitedBy,

                        redeemedByIdentityId:
                            invitation.redeemedByIdentityId,

                        redeemedAt:
                            invitation.redeemedAt,

                        revokedAt:
                            invitation.revokedAt,

                        expiredAt:
                            invitation.expiredAt,

                        createdAt:
                            invitation.createdAt,

                        updatedAt:
                            invitation.updatedAt,
                    },
                },
            ];

            await commitMembership({
                dependencies,

                context,

                aggregateType:
                    "membership.invitation",

                aggregateId:
                    invitation.invitationId,

                stateChanges,

                events: [
                    createMembershipEvent({
                        ids:
                            dependencies.ids,

                        context,

                        aggregateType:
                            "membership.invitation",

                        aggregateId:
                            invitation.invitationId,

                        eventType:
                            "membership.invitation.created",

                        occurredAt:
                            now,

                        payload,
                    }),
                ],

                outbox: [
                    createMembershipOutboxMessage({
                        ids:
                            dependencies.ids,

                        context,

                        subject:
                            dependencies
                                .outboxSubjects
                                .invitationCreated,

                        occurredAt:
                            now,

                        payload,
                    }),
                ],
            });

            return {
                ...invitation,
                invitationToken,
            };
        },
    };
}