# Membership Service™ — Events & Reactions

## Published Membership Facts

The current implementation emits replayable Membership lifecycle facts including:

- `membership.membership.created`
- `membership.membership.activated`
- `membership.membership.suspended`
- `membership.membership.reactivated`
- `membership.membership.archived`
- `membership.invitation.created`
- `membership.invitation.redeemed`
- `membership.invitation.revoked`
- `membership.invitation.expired`
- `membership.context.changed`
- `membership.context.cleared`

Events carry runtime metadata produced through the Membership event metadata boundary and participate in the Engine's replayable event/outbox model.

## Consumed Identity Facts

### `identity.invitation_redemption.requested`

Payload contract:
- `invitationId`
- `userId`
- `email`

Membership translates Identity's `userId` terminology to its internal `identityId` terminology and applies invitation redemption rules.

### `identity.user.activated`

Payload contract:
- `userId`

Membership uses this fact to activate eligible pending Membership participation.

## Consumed Lifecycle Facts

The Membership lifecycle reaction contract currently models:

- `identity.identity.archived`
- `tenant.suspended`
- `tenant.archived`
- `subscription.suspended`
- `subscription.reactivated`

These are external facts. Membership translates them into Membership-owned state transitions and does not copy external canonical state into its aggregate.

## Reaction Rules

- Reactions must be deterministic and replay-safe.
- Duplicate delivery must not create duplicate business effects.
- External lifecycle facts cannot bypass Membership invariants.
- Automatic reactivation is suspension-source aware.
- Reaction failures remain observable and retryable through the processing runtime.
- Cross-service event contracts are explicit boundary types, not shared mutable domain models.

## Choreography Boundary

Membership publishes facts about tenant participation. Identity publishes facts about global identity. Access consumes the resulting authenticated Membership context for authorization. No service gains ownership of another service's canonical state through event consumption.
