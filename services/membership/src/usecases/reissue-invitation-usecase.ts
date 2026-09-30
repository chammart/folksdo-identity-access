// services/membership/src/usecases/reissue-invitation-usecase.ts
// -----------------------------------------------------------------------------
// REISSUE INVITATION USE CASE
// -----------------------------------------------------------------------------
// Membership-owned controlled invitation resend/reissue.
//
// Rules:
//   • only a pending, unexpired invitation may be reissued
//   • reissue rotates the raw token and persists only its hash
//   • state + event + outbox commit atomically
//   • the idempotency key prevents duplicate canonical reissue commits
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import type { RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import type { ReissuedInvitationResult, ResendInvitationRequest } from "../api";
import { hashInvitationToken } from "../business-rules";
import { InvitationExpiredError, InvitationNotAvailableError, InvitationNotFoundError } from "../errors";
import { createMembershipEvent, createMembershipOutboxMessage } from "../events";
import { commitMembership } from "./membership-commit";
import type { MembershipMutationDependencies } from "./membership-usecase-contracts";


export interface ReissueInvitationUseCaseDependencies extends MembershipMutationDependencies {
    readonly defaultInvitationTtlMilliseconds: number;
}

export interface ReissueInvitationUseCase {
    execute(invitationId: string, input: ResendInvitationRequest, context: RuntimeContext): Promise<ReissuedInvitationResult>;
}

export function createReissueInvitationUseCase(dependencies: ReissueInvitationUseCaseDependencies): ReissueInvitationUseCase {
    return {
        async execute(invitationId, input, context) {
            const invitation = await dependencies.readStore.findInvitationById(invitationId);
            if (!invitation) throw new InvitationNotFoundError(invitationId);
            const now = dependencies.clock.nowTimestamp();

            if (invitation.lastReissueIdempotencyKey === input.idempotencyKey) {
                return toResult(invitation, false);
            }
            if (invitation.status !== "pending") {
                throw new InvitationNotAvailableError(invitationId);
            }
            if (Date.parse(invitation.expiresAt) <= Date.parse(now)) {
                throw new InvitationExpiredError(invitationId, invitation.expiresAt);
            }

            const invitationToken = randomBytes(32).toString("base64url");
            const invitationTokenHash = hashInvitationToken(invitationToken);
            const ttl = input.expiresInMilliseconds ?? dependencies.defaultInvitationTtlMilliseconds;
            const expiresAt = new Date(Date.parse(now) + ttl).toISOString();

            const stateChanges: StateChange[] = [{
                operation: "update",
                collection: dependencies.collections.invitations,
                key: { invitationId },
                patch: {
                    invitationTokenHash,
                    expiresAt,
                    lastReissueIdempotencyKey: input.idempotencyKey,
                    lastReissuedAt: now,
                    updatedAt: now,
                },
            }];

            const payload = {
                invitationId,
                targetTenantId: invitation.targetTenantId,
                invitedEmail: invitation.invitedEmail,
                membershipType: invitation.membershipType,
                status: invitation.status,
                expiresAt,
                reissuedBy: context.actor.actorId,
                reissuedAt: now,
                occurredAt: now,
            };

            await commitMembership({
                dependencies,
                context,
                aggregateType: "membership.invitation",
                aggregateId: invitationId,
                stateChanges,
                events: [createMembershipEvent({
                    ids: dependencies.ids, context,
                    aggregateType: "membership.invitation", aggregateId: invitationId,
                    eventType: "membership.invitation.reissued", occurredAt: now, payload,
                })],
                outbox: [createMembershipOutboxMessage({
                    ids: dependencies.ids, context,
                    subject: dependencies.outboxSubjects.invitationReissued,
                    occurredAt: now, payload,
                })],
            });

            return {
                invitationId,
                targetTenantId: invitation.targetTenantId,
                invitedEmail: invitation.invitedEmail,
                membershipType: invitation.membershipType,
                status: invitation.status,
                createdAt: invitation.createdAt,
                updatedAt: now,
                expiresAt,
                redeemedAt: invitation.redeemedAt,
                revokedAt: invitation.revokedAt,
                expiredAt: invitation.expiredAt,
                invitationToken,
                reissued: true,
            };
        },
    };
}

function toResult(invitation: Awaited<ReturnType<MembershipMutationDependencies["readStore"]["findInvitationById"]>>, reissued: boolean): ReissuedInvitationResult {
    if (!invitation) throw new InvitationNotFoundError();
    return {
        invitationId: invitation.invitationId,
        targetTenantId: invitation.targetTenantId,
        invitedEmail: invitation.invitedEmail,
        membershipType: invitation.membershipType,
        status: invitation.status,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
        expiresAt: invitation.expiresAt,
        redeemedAt: invitation.redeemedAt,
        revokedAt: invitation.revokedAt,
        expiredAt: invitation.expiredAt,
        reissued,
    };
}
