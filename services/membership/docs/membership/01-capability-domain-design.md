# Membership Service™ — Capability & Domain Design

## Purpose

Membership Service™ is the **Where** boundary of Folksdo IAM™. It owns the relationship between a global Identity and a tenant, the lifecycle of that participation, invitations to participate, and the active tenant execution context.

Identity answers **Who?** Membership answers **Where?** Access answers **What?**

## Ownership

Membership owns:
- Membership state and lifecycle.
- Membership type: `member`, `guest`, `service`, `provider_operator`.
- Membership status: `pending`, `active`, `suspended`, `archived`.
- Invitation state and lifecycle.
- Active membership/tenant context for an Identity.
- Membership lifecycle business rules and replayable events.

Membership does not own:
- Global identities, credentials, sessions, or email verification — Identity owns these.
- Roles, grants, permissions, restrictions, or authorization decisions — Access owns these.
- Tenant canonical lifecycle — the tenant domain owns it.
- Subscription canonical lifecycle — the subscription domain owns it.

## Canonical Aggregates

### Membership

A Membership binds `identityId` to `tenantId` using a stable `membershipId`.

Lifecycle:

`pending → active → suspended → active → archived`

Archival is terminal for the current Membership aggregate. Suspension records a business-safe reason and source so automated restoration can only undo the lifecycle condition that caused it.

Suspension sources are `manual`, `tenant`, `subscription`, `identity`, and `security_policy`.

### Invitation

An Invitation authorizes a normalized email address to join a target tenant with a defined Membership type.

Lifecycle:

`pending → redeemed | revoked | expired`

Only a one-way invitation token hash is persisted. Raw invitation tokens are not canonical state.

### Membership Context

Membership Context identifies the Membership and tenant in which an authenticated Identity is currently operating:
- `identityId`
- `activeMembershipId`
- `activeTenantId`

Context is independent from Access roles and permissions.

## Core Invariants

- Tenant participation is represented by Membership, never by Identity or Access.
- A Membership references a global Identity but does not own it.
- An invitation belongs to one target tenant and one normalized invited email.
- Redeemed, revoked, or expired invitations cannot be reused as pending invitations.
- Raw invitation tokens are never persisted.
- Active tenant context must resolve through a valid Membership for the authenticated Identity.
- Membership lifecycle transitions are committed through the Folksdo Engine as canonical state plus replayable event plus outbox where applicable.
- Access is consulted for protected business operations; Membership never interprets permission grants itself.

## Authorization Contract

Membership protects operations using stable permission identities:

`membership.member.create`, `membership.member.invite`, `membership.member.activate`, `membership.member.suspend`, `membership.member.reactivate`, `membership.member.archive`, `membership.member.view`, `membership.member.list`, `membership.invitation.view`, `membership.invitation.list`, `membership.invitation.revoke`, `membership.invitation.expire`, `membership.context.view`, `membership.context.switch`.

Access owns the final authorization decision.
