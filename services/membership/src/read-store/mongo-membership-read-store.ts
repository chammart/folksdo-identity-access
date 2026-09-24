// services/membership/src/read-store/mongo-membership-read-store.ts
// -----------------------------------------------------------------------------
// MONGO MEMBERSHIP READ STORE
// -----------------------------------------------------------------------------
// MongoDB implementation of the Membership-owned read-store contract.
//
// Purpose:
//   • resolve canonical Membership state
//   • resolve Membership invitations
//   • resolve active Membership execution contexts
//   • provide indexed Membership query paths
//   • keep MongoDB details outside Membership use cases
// -----------------------------------------------------------------------------

import type {
    Db,
} from "mongodb";

import type {
    InvitationState,
    MembershipContextState,
    MembershipState,
} from "../state";

import type {
    MembershipReadStore,
} from "./membership-read-store";

// -----------------------------------------------------------------------------
// COLLECTION CONFIGURATION
// -----------------------------------------------------------------------------

export interface MembershipCollections {
    readonly memberships: string;
    readonly invitations: string;
    readonly contexts: string;
}

// -----------------------------------------------------------------------------
// READ STORE FACTORY
// -----------------------------------------------------------------------------

export function createMongoMembershipReadStore(
    input: {
        readonly database: Db;
        readonly collections: MembershipCollections;
    },
): MembershipReadStore {
    const memberships =
        input.database.collection<MembershipState>(
            input.collections.memberships,
        );

    const invitations =
        input.database.collection<InvitationState>(
            input.collections.invitations,
        );

    const contexts =
        input.database.collection<MembershipContextState>(
            input.collections.contexts,
        );

    return {
        async findMembershipById(
            membershipId: string,
        ): Promise<MembershipState | null> {
            return memberships.findOne({
                membershipId,
            });
        },

        async findMembership(
            identityId: string,
            tenantId: string,
        ): Promise<MembershipState | null> {
            return memberships.findOne({
                identityId,
                tenantId,
            });
        },

        async listMembershipsByIdentity(
            identityId: string,
        ): Promise<readonly MembershipState[]> {
            return memberships
                .find({
                    identityId,
                })
                .sort({
                    createdAt: 1,
                    membershipId: 1,
                })
                .toArray();
        },

        async listMembershipsByTenant(
            tenantId: string,
        ): Promise<readonly MembershipState[]> {
            return memberships
                .find({
                    tenantId,
                })
                .sort({
                    createdAt: 1,
                    membershipId: 1,
                })
                .toArray();
        },

        async findInvitationById(
            invitationId: string,
        ): Promise<InvitationState | null> {
            return invitations.findOne({
                invitationId,
            });
        },

        async findInvitationByTokenHash(
            tokenHash: string,
        ): Promise<InvitationState | null> {
            return invitations.findOne({ invitationTokenHash: tokenHash });
        },

        async findPendingInvitation(tenantId, invitedEmail) {
            return invitations.findOne({
                targetTenantId: tenantId,
                invitedEmail,
                status: "pending",
            });
        },

        async listInvitationsByTenant(tenantId, status) {
            return invitations.find({
                targetTenantId: tenantId,
                ...(status ? { status } : {}),
            }).sort({ createdAt: -1, invitationId: 1 }).toArray();
        },

        async listExpiredPendingInvitations(now, limit) {
            return invitations.find({
                status: "pending",
                expiresAt: { $lte: now },
            }).sort({ expiresAt: 1, invitationId: 1 }).limit(limit).toArray();
        },

        async findCurrentContext(
            identityId: string,
        ): Promise<MembershipContextState | null> {
            return contexts.findOne({
                identityId,
            });
        },
    };
}

// -----------------------------------------------------------------------------
// INDEX MANAGEMENT
// -----------------------------------------------------------------------------

export async function ensureMembershipIndexes(
    input: {
        readonly database: Db;
        readonly collections: MembershipCollections;
    },
): Promise<void> {
    const memberships =
        input.database.collection<MembershipState>(
            input.collections.memberships,
        );

    const invitations =
        input.database.collection<InvitationState>(
            input.collections.invitations,
        );

    const contexts =
        input.database.collection<MembershipContextState>(
            input.collections.contexts,
        );

    await Promise.all([
        memberships.createIndex(
            {
                membershipId: 1,
            },
            {
                name: "membership_id_unique",
                unique: true,
            },
        ),

        memberships.createIndex(
            {
                identityId: 1,
                tenantId: 1,
            },
            {
                name: "membership_identity_tenant_unique",
                unique: true,
            },
        ),

        memberships.createIndex(
            {
                identityId: 1,
                status: 1,
                createdAt: 1,
            },
            {
                name: "membership_identity_status_created_at",
            },
        ),

        memberships.createIndex(
            {
                tenantId: 1,
                status: 1,
                createdAt: 1,
            },
            {
                name: "membership_tenant_status_created_at",
            },
        ),

        invitations.createIndex(
            {
                invitationId: 1,
            },
            {
                name: "invitation_id_unique",
                unique: true,
            },
        ),

        invitations.createIndex(
            {
                invitationTokenHash: 1,
            },
            {
                name: "invitation_token_hash_unique",
                unique: true,
            },
        ),

        invitations.createIndex(
            { targetTenantId: 1, invitedEmail: 1 },
            {
                name: "invitation_live_tenant_email_unique",
                unique: true,
                partialFilterExpression: { status: "pending" },
            },
        ),

        invitations.createIndex(
            { targetTenantId: 1, status: 1, createdAt: 1 },
            { name: "invitation_tenant_status_created_at" },
        ),

        invitations.createIndex(
            {
                status: 1,
                expiresAt: 1,
            },
            {
                name: "invitation_status_expires_at",
            },
        ),

        contexts.createIndex(
            {
                identityId: 1,
            },
            {
                name: "membership_context_identity_unique",
                unique: true,
            },
        ),

        contexts.createIndex(
            {
                activeTenantId: 1,
            },
            {
                name: "membership_context_active_tenant",
            },
        ),

        contexts.createIndex(
            {
                activeMembershipId: 1,
            },
            {
                name: "membership_context_active_membership",
            },
        ),
    ]);
}