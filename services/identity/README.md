# Identity Service™

Identity Service™ is the global identity and authentication boundary of Folksdo IAM™.

> **Identity answers: Who is the actor?**

## Owns

- Users and user profiles
- Credentials
- Email verification
- Authentication sessions
- Invitation-led sign-up validation
- Password reset and password change
- Local known-invitation projection required for sign-up
- Protected provider/operator Identity reads

Identity does **not** own Tenant Membership, roles, permissions, or Membership invitation lifecycle.

## Architecture

```text
Fastify routes
    ↓
Identity API
    ↓
Use cases
    ↓
Business rules / Identity state
    ↓
Engine + read stores + BetterAuth adapter
```

BetterAuth remains behind the Identity adapter. Provider concepts and identifiers do not define the public Identity contract.

## Public API

```text
POST /api/v1/identity/invitation-sign-up
POST /api/v1/identity/verify-email
POST /api/v1/identity/sign-in
POST /api/v1/identity/sign-out
GET  /api/v1/identity/session
GET  /api/v1/identity/me
POST /api/v1/identity/request-password-reset
POST /api/v1/identity/reset-password
POST /api/v1/identity/change-password
```

Provider/operator reads:

```text
GET /api/v1/identities
GET /api/v1/identities/:userId
```

These reads are protected through Access permissions `identity.identity.list` and `identity.identity.view`.

## Collaboration

Membership owns invitation lifecycle. Identity consumes Membership invitation facts into its known-invitation projection and emits `identity.invitation_redemption.requested` after successful invitation-led sign-up.

Identity publishes authentication and lifecycle facts including session, verification, activation, password-reset, and credential-update events.

## Documentation

- [Capability & Domain Design](../../docs/identity/01-capability-domain-design.md)
- [Architecture](../../docs/identity/02-architecture.md)
- [Business Use Cases](../../docs/identity/03-business-use-cases.md)
- [API Contract](../../docs/identity/04-api-contract.md)
- [Events & Reactions](../../docs/identity/05-events-reactions.md)
- [Runtime, Testing & Certification](../../docs/identity/06-runtime-testing-certification.md)

## IAM Position

```text
Identity
  WHO
   ↓
Membership
 WHERE
   ↓
Access
 WHAT
```

Identity establishes authenticated actor truth. It does not grant Tenant participation or authorization.
