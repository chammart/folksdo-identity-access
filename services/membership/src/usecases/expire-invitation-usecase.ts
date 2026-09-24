// -----------------------------------------------------------------------------
// EXPIRE INVITATION USE CASE
// -----------------------------------------------------------------------------
import type { RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import type { InvitationResult } from "../api";
import { expireInvitation } from "../business-rules";
import { InvitationNotFoundError } from "../errors";
import { createMembershipEvent, createMembershipOutboxMessage } from "../events";
import { commitMembership } from "./membership-commit";
import type { MembershipMutationDependencies } from "./membership-usecase-contracts";
import { toInvitationResult } from "./invitation-result";

export interface ExpireInvitationUseCase {
    execute(invitationId: string, context: RuntimeContext): Promise<InvitationResult>;
}
export function createExpireInvitationUseCase(dependencies: MembershipMutationDependencies): ExpireInvitationUseCase {
    return { async execute(invitationId, context) {
        const current = await dependencies.readStore.findInvitationById(invitationId);
        if (!current) throw new InvitationNotFoundError(invitationId);
        if (current.status === "expired") return toInvitationResult(current);
        const now = dependencies.clock.nowTimestamp();
        const invitation = expireInvitation({ invitation: current, now });
        const payload = {
            invitationId: invitation.invitationId,
            targetTenantId: invitation.targetTenantId,
            invitedEmail: invitation.invitedEmail,
            membershipType: invitation.membershipType,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            expiredAt: invitation.expiredAt,
            occurredAt: now,
        };
        const stateChanges: StateChange[] = [{
            operation: "update", collection: dependencies.collections.invitations,
            key: { invitationId },
            patch: { status: "expired", expiredAt: invitation.expiredAt, updatedAt: invitation.updatedAt },
        }];
        await commitMembership({ dependencies, context, aggregateType: "membership.invitation", aggregateId: invitationId, stateChanges,
            events: [createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.invitation", aggregateId: invitationId, eventType: "membership.invitation.expired", occurredAt: now, payload })],
            outbox: [createMembershipOutboxMessage({ ids: dependencies.ids, context, subject: dependencies.outboxSubjects.invitationExpired, occurredAt: now, payload })],
        });
        return toInvitationResult(invitation);
    }};
}
