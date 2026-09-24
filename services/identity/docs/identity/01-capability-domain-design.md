# Identity Service™ — Capability & Domain Design

## Purpose

Identity Service™ owns the global identity and authentication boundary of Folksdo IAM™. It answers: who is the actor, can the actor authenticate, what credential/session state exists, and has the identity completed required verification?

## Owns

Identity owns users, user profiles, credentials, email verification state, authentication sessions, password-reset behavior and a local projection of known Membership invitations required to verify invitation-led signup.

## Does not own

Identity does not own tenant membership, roles, permissions, tenant lifecycle, or Membership invitation lifecycle. BetterAuth is an implementation provider behind an Identity adapter; provider concepts do not define the public Identity contract.

## Core state

The current service has explicit state models for `User`, `UserProfile`, `Credential`, `EmailVerification` and `Session`, plus `KnownInvitationState` as a reaction-maintained local projection.

Identity persistence uses dedicated collections for users, credentials, sessions, email verifications and known invitations.

## Business invariants

- Invitation signup requires a known valid invitation and matching invited email.
- Duplicate identity creation is rejected.
- Verification requires a valid verification token and cannot re-verify an already verified user.
- Sign-in requires valid credentials and an identity eligible to sign in.
- Session-bound operations require an active authentication session.
- Password changes derive the target identity from authenticated runtime context; callers do not supply a user ID or session ID to select another identity.
- Provider/operator identity reads require Access authorization.

## Provider boundary

BetterAuth is accessed through `BetterAuthIdentityAdapter`. Public DTOs intentionally exclude BetterAuth concepts and provider identifiers. Identity remains the owner of business semantics even when a provider performs credential/session mechanics.

## Authorization

Self-service authentication behavior is protected by authentication/session rules. Provider/operator reads use Access through the Identity authorization boundary. Current permissions are:

- `identity.identity.list`
- `identity.identity.view`

## Source-of-truth implementation

- `services/identity/src/state/`
- `services/identity/src/business-rules/`
- `services/identity/src/adapters/better-auth/`
- `services/identity/src/authorization/`
- `services/identity/src/known-invitations/`
