// services/membership/src/runtime/provider-bootstrap.ts
// -----------------------------------------------------------------------------
// PROVIDER BOOTSTRAP — MEMBERSHIP PORT
// -----------------------------------------------------------------------------
// Trusted service-owned entry point used only by environment bootstrap tooling.
// It reuses Membership use cases so canonical state, events and outbox remain
// authoritative. Transport/authentication of the bootstrap caller is host-owned.
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { MembershipReadStore } from "../read-store";
import type { MembershipState } from "../state";
import type {
    ActivateMembershipUseCase,
    InviteMemberUseCase,
    InviteMemberResult,
    RevokeInvitationUseCase,
} from "../usecases";

export interface InviteProviderOperatorBootstrapInput {
    readonly tenantId: string;
    readonly email: string;
    readonly expiresInMilliseconds?: number;
}

export interface MembershipProviderBootstrap {
    inviteProviderOperator(
        input: InviteProviderOperatorBootstrapInput,
        context: RuntimeContext,
    ): Promise<InviteMemberResult>;

    findProviderMembership(identityId: string, tenantId: string): Promise<MembershipState | null>;

    ensureProviderMembershipActive(
        identityId: string,
        tenantId: string,
        context: RuntimeContext,
    ): Promise<MembershipState>;
}

export function createMembershipProviderBootstrap(input: {
    readonly inviteMemberUseCase: InviteMemberUseCase;
    readonly revokeInvitationUseCase: RevokeInvitationUseCase;
    readonly activateMembershipUseCase: ActivateMembershipUseCase;
    readonly readStore: MembershipReadStore;
}): MembershipProviderBootstrap {
    return {
        async inviteProviderOperator(request, context) {
            const invite = () => input.inviteMemberUseCase.execute({
                tenantId: request.tenantId,
                invitedEmail: request.email,
                membershipType: "provider_operator",
                ...(request.expiresInMilliseconds === undefined
                    ? {}
                    : { expiresInMilliseconds: request.expiresInMilliseconds }),
            }, context);

            const invitation = await invite();
            if (invitation.invitationToken) return invitation;

            // A previous interrupted bootstrap may have left a live pending
            // invitation. Its one-time raw token is intentionally unrecoverable.
            // Revoke it through the normal Membership use case and create a fresh
            // invitation rather than reading or rewriting canonical state directly.
            await input.revokeInvitationUseCase.execute(
                invitation.invitationId,
                context,
            );

            return await invite();
        },

        async findProviderMembership(identityId, tenantId) {
            const membership = await input.readStore.findMembership(identityId, tenantId);
            return membership?.membershipType === "provider_operator" ? membership : null;
        },

        async ensureProviderMembershipActive(identityId, tenantId, context) {
            const membership = await input.readStore.findMembership(identityId, tenantId);
            if (!membership || membership.membershipType !== "provider_operator") {
                throw new Error("Provider Membership was not found after invitation redemption.");
            }

            if (membership.status === "active") return membership;
            if (membership.status !== "pending") {
                throw new Error(`Provider Membership cannot be activated from status ${membership.status}.`);
            }

            await input.activateMembershipUseCase.execute(
                membership.membershipId,
                context,
            );

            const activated = await input.readStore.findMembership(identityId, tenantId);
            if (!activated || activated.membershipType !== "provider_operator" || activated.status !== "active") {
                throw new Error("Provider Membership activation did not persist canonical active state.");
            }

            return activated;
        },
    };
}
