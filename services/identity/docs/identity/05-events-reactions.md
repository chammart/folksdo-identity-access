# Identity Service™ — Events & Reactions

## Purpose

Identity uses replayable events for durable business facts and Processing reactions for cross-capability choreography. Identity does not connect to NATS or own broker subscriptions directly.

## Identity outbox subjects

The current runtime defines these Identity-owned subjects:

| Subject | Meaning |
|---|---|
| `identity.email_verification.requested` | Email verification was requested |
| `identity.invitation_redemption.requested` | Signup completed far enough to request Membership invitation redemption |
| `identity.user_email_verified` | User email was verified |
| `identity.user.activated` | Identity became active |
| `identity.session_created` | Authentication session was created |
| `identity.session_ended` | Authentication session ended |
| `identity.password_reset_requested` | Password reset was requested |
| `identity.credential_updated` | Password credential was updated |

Event payloads are intended to be replayable and secret-safe. Passwords, raw invitation tokens and other secrets must not become event facts.

## Membership events consumed by Identity

Identity currently registers one reaction group for exactly four Membership invitation subjects:

- `membership.invitation.created`
- `membership.invitation.expired`
- `membership.invitation.revoked`
- `membership.invitation.redeemed`

These events maintain Identity's local known-invitation projection. Created records the invitation facts required for local signup verification; expired/revoked/redeemed transition the projection accordingly.

## Ownership

Membership remains authoritative for invitation lifecycle. The Identity projection is not an alternate Membership aggregate and must not be used to claim ownership of Membership state.

## Delivery boundary

Folksdo Processing owns delivery, retry and dead-letter behavior. Identity owns only the business reaction handler and dispatcher. Incoming event payloads are validated/mapped before dispatch.

## Explicit non-contracts

The current Identity runtime does **not** register reactions for tenant suspension, tenant archival, member deactivation or security-policy changes. Such reactions must not be documented as current behavior unless implemented and certified.

## Source-of-truth implementation

- `services/identity/src/events/`
- `services/identity/src/reactions/`
- `services/identity/src/runtime/register-identity-reactions.ts`
- `services/identity/src/runtime/bootstrap-identity-service.ts`
