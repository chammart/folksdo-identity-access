// services/identity/src/known-invitations/mongo-known-invitation-read-store.ts
// -----------------------------------------------------------------------------
// MONGO KNOWN INVITATION READ STORE
// -----------------------------------------------------------------------------
// Mongo-backed local invitation read model for Identity Service™.
//
// Purpose:
//   • store Membership invitation facts locally inside Identity
//   • support local invitation verification during signup
//   • support event-driven invitation lifecycle reactions
// -----------------------------------------------------------------------------

import type { Collection, Db } from "mongodb";

import type { KnownInvitationState } from "./known-invitation-state";
import type { KnownInvitationReadStore } from "./known-invitation-read-store";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateMongoKnownInvitationReadStoreInput {
    readonly database: Db;

    readonly collectionName: string;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createMongoKnownInvitationReadStore(
    input: CreateMongoKnownInvitationReadStoreInput,
): KnownInvitationReadStore {
    const invitations = input.database.collection<KnownInvitationState>(
        input.collectionName,
    );

    return {
        async findByTokenHash(
            invitationTokenHash: string,
        ): Promise<KnownInvitationState | null> {
            return await invitations.findOne({
                invitationTokenHash,
            });
        },

        async upsertKnownInvitation(
            invitation: KnownInvitationState,
        ): Promise<void> {
            await invitations.updateOne(
                {
                    invitationId: invitation.invitationId,
                },
                {
                    $set: invitation,
                },
                {
                    upsert: true,
                },
            );
        },

        async markKnownInvitationStatus(input) {
            await invitations.updateOne(
                {
                    invitationId: input.invitationId,
                },
                {
                    $set: {
                        status: input.status,
                        updatedAt: input.updatedAt,
                    },
                },
            );
        },
    };
}

// -----------------------------------------------------------------------------
// INDEXES
// -----------------------------------------------------------------------------

export async function ensureKnownInvitationIndexes(input: {
    readonly database: Db;

    readonly collectionName: string;
}): Promise<void> {
    const invitations: Collection = input.database.collection(
        input.collectionName,
    );

    await invitations.createIndex(
        {
            invitationId: 1,
        },
        {
            unique: true,
        },
    );

    await invitations.createIndex(
        {
            invitationTokenHash: 1,
        },
        {
            unique: true,
        },
    );

    await invitations.createIndex({
        status: 1,
        expiresAt: 1,
    });

    await invitations.createIndex({
        targetTenantId: 1,
        invitedEmail: 1,
    });
}
