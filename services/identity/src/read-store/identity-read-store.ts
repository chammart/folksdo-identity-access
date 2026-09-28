// services/identity/src/read-store/identity-read-store.ts
// -----------------------------------------------------------------------------
// IDENTITY READ STORE
// -----------------------------------------------------------------------------
// Read abstractions for Identity Service™.
// -----------------------------------------------------------------------------

import type {
    IdentityCredentialState,
    IdentityEmailVerificationState,
    IdentitySessionState,
    IdentityUserState,
    IdentityUserStatus,
} from "../state";

// -----------------------------------------------------------------------------
// CREDENTIAL READ STORE
// -----------------------------------------------------------------------------
// Credential queries remain separate from the general Identity read store.
//
// Purpose:
//   • resolve provider-linked credentials when provider confirmation is available
//   • resolve the canonical active password credential for an Identity user
//   • avoid reconstructing or guessing provider-owned credential identifiers
//   • keep credential-specific dependencies narrow
// -----------------------------------------------------------------------------

export interface IdentityCredentialReadStore {
    findCredentialByProviderCredentialId(
        providerCredentialId:
            string,
    ): Promise<IdentityCredentialState | null>;

    findActivePasswordCredentialByUserId(
        userId:
            string,
    ): Promise<IdentityCredentialState | null>;
}

// -----------------------------------------------------------------------------
// PASSWORD-RESET SESSION READ STORE
// -----------------------------------------------------------------------------
// Dedicated query required only by Reset Password™.
//
// This is intentionally separate from IdentityReadStore so unrelated use cases
// and their test doubles do not acquire an unnecessary dependency.
// -----------------------------------------------------------------------------

export interface IdentityPasswordResetSessionReadStore {
    listActiveSessionsByUserId(
        userId:
            string,
    ): Promise<readonly IdentitySessionState[]>;
}

// -----------------------------------------------------------------------------
// ADMINISTRATION SESSION READ STORE
// -----------------------------------------------------------------------------
// Narrow dependency for safe administration session summaries.
// -----------------------------------------------------------------------------

export interface IdentityAdministrationSessionReadStore {
    listSessionsByUserId(
        userId:
            string,
    ): Promise<readonly IdentitySessionState[]>;
}


export interface IdentitySecurityHistoryEvent {
    readonly eventType: string;
    readonly occurredAt: string;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly actorId?: string;
    readonly tenantId?: string;
}

export interface IdentitySecurityHistoryReadStore {
    listSecurityEventsByUserId(userId: string): Promise<readonly IdentitySecurityHistoryEvent[]>;
}

export interface IdentitySecuritySummaryReadStore {
    findActivePasswordCredentialByUserId(userId: string): Promise<IdentityCredentialState | null>;
    findLatestPasswordResetRequestByUserId(userId: string): Promise<{ readonly status: "requested"; readonly requestedAt: string } | null>;
}

// -----------------------------------------------------------------------------
// GENERAL IDENTITY READ STORE
// -----------------------------------------------------------------------------

export interface IdentityReadStore {
    findUserByEmail(
        email:
            string,
    ): Promise<IdentityUserState | null>;

    findUserById(
        userId:
            string,
    ): Promise<IdentityUserState | null>;

    findSessionById(
        sessionId:
            string,
    ): Promise<IdentitySessionState | null>;

    findVerificationById(
        verificationId:
            string,
    ): Promise<IdentityEmailVerificationState | null>;

    listUsers(
        input:
            ListUsersInput,
    ): Promise<ListUsersResult>;
}

// -----------------------------------------------------------------------------
// USER LISTING
// -----------------------------------------------------------------------------

export interface ListUsersInput {
    readonly search?:
    string;

    readonly status?:
    IdentityUserStatus;

    readonly emailVerified?:
    boolean;

    readonly offset:
    number;

    readonly limit:
    number;
}

export interface ListUsersResult {
    readonly users:
    readonly IdentityUserState[];

    readonly total:
    number;
}