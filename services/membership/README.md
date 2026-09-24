# Membership Service™

Membership Service™ owns Identity-to-Tenant participation inside Folksdo IAM™.

> **Membership answers: Where does the actor operate?**

## Owns

- Membership lifecycle
- Tenant-scoped invitations
- Invitation redemption, revocation, and expiration
- Active Membership Context
- Tenant Membership queries
- Provider/operator Membership reads
- Membership-owned reactions to authoritative Identity and external lifecycle facts

Membership does **not** own authentication credentials or final permission decisions.

## Architecture

```text
Authenticated Identity
        ↓
Membership API / Use Cases
        ↓
Membership + Invitation state
        ↓
Membership Context
        ↓
Access authorization
```

Membership owns its canonical state and translates external lifecycle facts into Membership-owned consequences without taking ownership of external state.

## Public API

Primary routes are under:

```text
/api/v1/membership
```

The surface includes Membership creation/lifecycle, invitation creation/lifecycle, current Membership Context, context switching, Tenant Membership queries, and provider/operator Membership reads.

Representative routes:

```text
POST /api/v1/membership
POST /api/v1/membership/invitations
POST /api/v1/membership/invitations/redeem
GET  /api/v1/membership/current
POST /api/v1/membership/context
GET  /api/v1/membership/:membershipId
GET  /api/v1/membership/tenant/:tenantId
```

## Events & Reactions

Membership publishes replayable Membership, invitation, and context lifecycle facts.

It consumes authoritative facts including:

```text
identity.invitation_redemption.requested
identity.user.activated
identity.identity.archived
tenant.suspended
tenant.archived
subscription.suspended
subscription.reactivated
```

Reactions are deterministic, replay-safe, and suspension-source aware.

## Documentation

- [Capability & Domain Design](../../docs/membership/01-capability-domain-design.md)
- [Architecture](../../docs/membership/02-architecture.md)
- [Business Use Cases](../../docs/membership/03-business-use-cases.md)
- [API Contract](../../docs/membership/04-api-contract.md)
- [Events & Reactions](../../docs/membership/05-events-reactions.md)
- [Runtime, Testing & Certification](../../docs/membership/06-runtime-testing-certification.md)

## IAM Position

```text
Identity establishes WHO
          ↓
Membership establishes WHERE
          ↓
Access establishes WHAT
```

A Membership identifier or Tenant identifier is context, not authority. Access remains the final authorization authority.
