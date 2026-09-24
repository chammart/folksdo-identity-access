// services/membership/src/authorization/membership-invariant-guard.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP INVARIANT GUARD
// -----------------------------------------------------------------------------
// Membership-owned security and participation invariants.
//
// Purpose:
//   • resolve canonical Membership-owned resources
//   • enforce authenticated Identity ownership
//   • enforce Membership lifecycle eligibility
//   • enforce Tenant consistency
//   • resolve the actor's canonical Membership Context
//
// Boundary:
//   • Membership owns Membership, invitation, and context invariants
//   • Access Operations™ owns permission and policy authorization
//   • this guard never interprets RuntimeContext.permissions
//   • this guard never evaluates Roles, Policies, or Restrictions
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import {
    InvitationNotFoundError,
    MembershipContextNotFoundError,
    MembershipNotFoundError,
} from "../errors";

import type {
    MembershipReadStore,
} from "../read-store";

import type {
    InvitationState,
    MembershipContextState,
    MembershipState,
} from "../state";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface MembershipInvariantGuard {
    /**
     * Ensure a requested Identity is the authenticated actor.
     */
    assertActorIdentity(
        identityId: string,
        context: RuntimeContext,
    ): void;

    /**
     * Resolve canonical Membership state.
     */
    resolveMembership(
        membershipId: string,
    ): Promise<MembershipState>;

    /**
     * Resolve canonical invitation state.
     */
    resolveInvitation(
        invitationId: string,
    ): Promise<InvitationState>;

    /**
     * Resolve the active Membership Context owned by an Identity.
     */
    resolveCurrentContext(
        identityId: string,
    ): Promise<MembershipContextState>;

    /**
     * Ensure the Membership belongs to the authenticated actor.
     */
    assertOwnMembership(
        membership: MembershipState,
        context: RuntimeContext,
    ): void;

    /**
     * Ensure a Membership is eligible for active execution context.
     */
    assertActiveMembership(
        membership: MembershipState,
    ): void;

    /**
     * Ensure a Membership belongs to the expected Tenant.
     */
    assertTenantConsistency(
        tenantId: string,
        membership: MembershipState,
    ): void;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createMembershipInvariantGuard(
    readStore: MembershipReadStore,
): MembershipInvariantGuard {
    function deny(
        reason: string,
    ): never {
        throw new SecurityError(
            "Membership invariant validation denied.",
            {
                securityType: "authorization",
                reason,
            },
        );
    }

    return {
        assertActorIdentity(
            identityId,
            context,
        ): void {
            if (
                context.actor.actorId
                !== identityId
            ) {
                deny(
                    "cross_identity_access_denied",
                );
            }
        },

        async resolveMembership(
            membershipId,
        ): Promise<MembershipState> {
            const membership =
                await readStore.findMembershipById(
                    membershipId,
                );

            if (!membership) {
                throw new MembershipNotFoundError(
                    membershipId,
                );
            }

            return membership;
        },

        async resolveInvitation(
            invitationId,
        ): Promise<InvitationState> {
            const invitation =
                await readStore.findInvitationById(
                    invitationId,
                );

            if (!invitation) {
                throw new InvitationNotFoundError(
                    invitationId,
                );
            }

            return invitation;
        },

        async resolveCurrentContext(
            identityId,
        ): Promise<MembershipContextState> {
            const membershipContext =
                await readStore.findCurrentContext(
                    identityId,
                );

            if (!membershipContext) {
                throw new MembershipContextNotFoundError(
                    identityId,
                );
            }

            return membershipContext;
        },

        assertOwnMembership(
            membership,
            context,
        ): void {
            if (
                membership.identityId
                !== context.actor.actorId
            ) {
                deny(
                    "cross_identity_access_denied",
                );
            }
        },

        assertActiveMembership(
            membership,
        ): void {
            if (
                membership.status
                !== "active"
            ) {
                deny(
                    "inactive_membership_context",
                );
            }
        },

        assertTenantConsistency(
            tenantId,
            membership,
        ): void {
            if (
                membership.tenantId
                !== tenantId
            ) {
                deny(
                    "cross_tenant_access_denied",
                );
            }
        },
    };
}