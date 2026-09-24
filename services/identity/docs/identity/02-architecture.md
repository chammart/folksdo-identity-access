# Identity Service™ — Architecture

## Architectural shape

Identity follows a capability-owned ports-and-adapters structure:

```text
Fastify routes
    ↓
IdentityApi
    ↓
Use cases
    ↓
Business rules / state
    ↓
Folksdo Engine + read stores + BetterAuth adapter

External replayable events
    ↓
Folksdo Processing
    ↓
Identity reaction dispatcher
    ↓
Known-invitation projection
```

## Layers

### API

`src/api` owns transport-safe DTOs, the synchronous `IdentityApi`, Fastify route registration, validation, route context and deterministic HTTP error translation.

### Use cases

`src/usecases` owns orchestration for the nine customer-facing Identity behaviors plus protected provider identity reads.

### Domain/state and business rules

`src/state` and `src/business-rules` define Identity-owned state and state transitions. Use cases compose these rules rather than placing business behavior in Fastify or the host.

### Adapters

`src/adapters/better-auth` isolates BetterAuth. Provider identifiers and implementation details must not cross the public Identity API.

### Persistence/read models

`src/read-store` provides Identity read contracts and MongoDB implementations. `src/known-invitations` owns the local invitation projection used by invitation signup.

### Events and reactions

Identity commits replayable business events/outbox messages through Folksdo Engine. External Membership invitation events are delivered by Folksdo Processing to Identity-owned reaction handlers. Identity does not subscribe to NATS directly.

### Runtime

`createIdentityRuntime` composes authorization, use cases, API and reactions. `bootstrapIdentityService` owns database indexes, Mongo read stores, BetterAuth runtime configuration, identifiers, collection names, outbox subjects and Fastify registration.

## Host integration

The IAM server bootstraps Identity before Membership and Access so authentication context can be established. Cross-capability authorizers are bound after Access is available and fail closed while unbound.

## Important design decisions

- BetterAuth is an adapter, not the domain.
- Membership invitation truth stays in Membership; Identity keeps only the projection required for local verification.
- Identity reactions are broker-neutral.
- Runtime context is the trusted source for authenticated actor identity.
- Provider/operator reads are a distinct protected surface rather than self-service identity endpoints.

## Source-of-truth implementation

- `services/identity/src/runtime/`
- `services/identity/src/api/`
- `services/identity/src/usecases/`
- `services/identity/src/reactions/`
- `apps/server/src/bootstrap/bootstrap-server.ts`
