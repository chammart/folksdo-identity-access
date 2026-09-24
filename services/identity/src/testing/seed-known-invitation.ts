// services/identity/src/testing/seed-known-invitation.ts
// -----------------------------------------------------------------------------
// SEED IDENTITY KNOWN INVITATION
// -----------------------------------------------------------------------------
// Reusable Identity Service™ test fixture for known invitation verification.
//
// Purpose:
//   • create deterministic known invitation records
//   • support isolated E2E test setup
//   • support the local development seed command
//   • preserve asynchronous Identity/Membership boundaries
//
// This module contains no environment loading, process termination, logging,
// or database lifecycle ownership. Those concerns belong to the caller.
// -----------------------------------------------------------------------------

import {
    createHash,
} from "node:crypto";

import type {
    Db,
} from "mongodb";

// -----------------------------------------------------------------------------
// CONTRACTS
// -----------------------------------------------------------------------------

export interface SeedKnownInvitationInput {
    invitationId: string;
    targetTenantId: string;
    invitedEmail: string;
    invitationToken: string;
    expiresAt: Date;
}

export interface SeedKnownInvitationOptions {
    collectionName?: string;
}

// -----------------------------------------------------------------------------
// SEED
// -----------------------------------------------------------------------------

export async function seedKnownInvitation(
    database: Db,
    input: SeedKnownInvitationInput,
    options: SeedKnownInvitationOptions = {},
): Promise<void> {
    const collectionName =
        options.collectionName ??
        "identity_known_invitations";

    const now =
        new Date();

    const invitation = {
        invitationId:
            input.invitationId,

        targetTenantId:
            input.targetTenantId,

        invitedEmail:
            normalizeEmail(input.invitedEmail),

        invitationTokenHash:
            hashInvitationToken(input.invitationToken),

        status:
            "pending" as const,

        expiresAt:
            input.expiresAt.toISOString(),

        createdAt:
            now.toISOString(),

        updatedAt:
            now.toISOString(),
    };

    await database
        .collection(collectionName)
        .updateOne(
            {
                invitationId:
                    input.invitationId,
            },
            {
                $set:
                    invitation,
            },
            {
                upsert:
                    true,
            },
        );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

export function hashInvitationToken(
    token: string,
): string {
    return createHash("sha256")
        .update(token.trim())
        .digest("hex");
}

function normalizeEmail(
    email: string,
): string {
    return email
        .trim()
        .toLowerCase();
}