// services/identity/src/events/identity-events.ts
// -----------------------------------------------------------------------------
// IDENTITY EVENTS
// -----------------------------------------------------------------------------
// Replayable, secret-safe Identity business facts.
// -----------------------------------------------------------------------------

import type { IdentityEventMetadata } from "./identity-event-metadata";

export interface IdentityDomainEvent<TPayload extends Record<string, unknown>> {
    readonly eventId: string;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly eventType: string;
    readonly version: number;
    readonly occurredAt: string;
    readonly payload: Readonly<TPayload>;
    readonly metadata: IdentityEventMetadata;
}

export type UserCreated = IdentityDomainEvent<{
    readonly userId: string;
    readonly email: string;
    readonly status: string;
    readonly emailVerified: boolean;
}>;

export type UserProfileCreated = IdentityDomainEvent<{
    readonly profileId: string;
    readonly userId: string;
    readonly displayName?: string;
    readonly locale?: string;
    readonly timezone?: string;
}>;

export type CredentialAdded = IdentityDomainEvent<{
    readonly credentialId: string;
    readonly userId: string;
    readonly type: string;
    readonly provider: string;
    readonly providerCredentialId: string;
    readonly status: string;
}>;

export type SessionCreated = IdentityDomainEvent<{
    readonly sessionId: string;
    readonly userId: string;
    readonly email: string;
    readonly createdAt: string;
    readonly expiresAt: string;
}>;

export type SessionEnded = IdentityDomainEvent<{
    readonly sessionId: string;
    readonly userId: string;
    readonly endedAt: string;
    readonly reason: "signed_out";
}>;

export type EmailVerificationRequested = IdentityDomainEvent<{
    readonly verificationId: string;
    readonly userId: string;
    readonly email: string;
    readonly provider: string;
    readonly providerVerificationId?: string;
    readonly status: string;
    readonly requestedAt: string;
    readonly expiresAt: string;
}>;

export type InvitationRedemptionRequested = IdentityDomainEvent<{
    readonly invitationId: string;
    readonly userId: string;
    readonly email: string;
    readonly targetTenantId: string;
    readonly requestedAt: string;
}>;

export type UserEmailVerified = IdentityDomainEvent<{
    readonly userId: string;
    readonly email: string;
    readonly verifiedAt: string;
}>;

export type UserActivated = IdentityDomainEvent<{
    readonly userId: string;
    readonly activatedAt: string;
}>;

export type PasswordResetRequested = IdentityDomainEvent<{
    readonly userId: string;
    readonly email: string;
    readonly requestedAt: string;
}>;

export type CredentialUpdated = IdentityDomainEvent<{
    readonly userId: string;
    readonly credentialType: "password";
    readonly updatedAt: string;
    readonly reason: "password_reset";
}>;
