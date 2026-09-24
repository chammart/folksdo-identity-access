# Membership Service™ — Architecture

## Architectural Role

Membership is a bounded service inside Folksdo IAM™ and sits between Identity and Access:

```text
Identity Service™
      │ authenticated identity
      ▼
Membership Service™
      │ tenant participation/context
      ▼
Access Service™
      │ authorization decision
      ▼
Business operation
```

## Internal Structure

```text
HTTP / Reactions / Workers
          │
          ▼
      Use Cases
          │
    Business Rules
          │
          ▼
Folksdo Engine Runtime
 state + event + outbox
          │
          ▼
 Read Store / MongoDB
```

The implementation is separated into `api`, `authorization`, `business-rules`, `errors`, `events`, `reactions`, `read-store`, `runtime`, `state`, `usecases`, and `workers`.

## Request Path

1. Fastify receives the request.
2. Route context resolves authenticated runtime context.
3. Request DTO is validated.
4. Membership invariant/authorization guards enforce the business boundary.
5. The use case loads required state/read models.
6. A pure business rule determines the transition.
7. The transition is committed atomically through the Engine.
8. The route returns the public Membership DTO or translated HTTP error.

## Invitation Architecture

Membership owns invitation creation, lookup, listing, redemption, revocation, and expiration. Identity participates in invitation-driven onboarding through events rather than owning Membership invitation state.

Invitation redemption can create/bind Membership participation while preserving the Identity/Membership boundary.

## Context Architecture

The active Membership Context is the tenant-selection contribution to runtime security context. Identity establishes the authenticated actor; Membership establishes the active tenant participation; Access evaluates authority within that context.

## Reaction Architecture

Membership consumes external lifecycle facts through typed reaction contracts and translates them into Membership-owned transitions. External event payloads are never treated as canonical Membership state.

Current Identity-driven reactions include invitation redemption requests and user activation. Lifecycle reactions also model Identity archival and tenant/subscription suspension/restoration facts.

## Worker Architecture

Invitation expiration is supported by an invitation expiration worker. Expiration remains a Membership-owned lifecycle transition and is committed using the same state/event rules as API-triggered transitions.

## Persistence

Canonical writes use the Folksdo Engine. Membership read concerns are exposed through a Membership read-store abstraction with a MongoDB implementation. The service does not bypass its domain/use-case boundary to mutate canonical state.

## Dependency Rules

- Membership may depend on stable Platform/Engine contracts.
- Membership may consume Identity, tenant, and subscription facts through explicit contracts.
- Membership may ask Access for authorization.
- Identity and Access internals must not leak into Membership domain state.
- HTTP routes remain thin; business rules remain framework-independent.
