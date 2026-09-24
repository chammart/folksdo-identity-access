# Folksdo IAM™ — Architecture

## Purpose

Folksdo IAM™ is the standalone identity and access service boundary. It composes three business capabilities in a strict security chain:

**Identity (Who) → Membership (Where) → Access (What)**

The IAM host is intentionally thin. Business behavior remains inside the owning capability.

## System composition

The server composes:

- Folksdo Platform Runtime™ for MongoDB, Engine, Processing and shared runtime infrastructure.
- Identity Service™ for authentication, credentials, sessions and identity lifecycle.
- Membership Service™ for tenant membership and active membership context.
- Access Service™ for authorization and permission evaluation.

The current workspace consumes shared packages from `folksdo-platform` and `folksdo-engine`; it does not depend on Folksdo Operations™.

## Runtime security chain

1. Identity authenticates the actor and establishes identity context.
2. Membership resolves the actor's active tenant/membership context.
3. Access evaluates the requested permission in that context.
4. Capability routes execute only after their required authentication/authorization boundary succeeds.

The host adapters bridge the capabilities without moving business ownership into the server.

## Runtime lifecycle

The server creates Platform Runtime, bootstraps Identity, Membership and Access, binds the cross-capability authorization adapters, then starts Platform Runtime, Access Runtime and Fastify.

Readiness is exposed at `GET /health/ready`. The server is ready only when Platform Runtime and Access Runtime are ready. Liveness is exposed at `GET /health/live`.

## Architectural rules

- Capabilities own business behavior and contracts.
- The host owns composition, authentication context wiring and transport startup.
- Identity does not own tenant membership or permission truth.
- Membership does not own authentication credentials.
- Access does not own identity or membership lifecycle.
- Cross-capability asynchronous behavior uses replayable events and Processing reactions.
- Provider integrations remain behind capability-owned adapters.
- Public DTOs must not expose provider-specific concepts.

## Source-of-truth implementation

Primary implementation references:

- `apps/server/src/bootstrap/bootstrap-server.ts`
- `services/identity/src/`
- `services/membership/src/`
- `services/access/src/`
- `pnpm-workspace.yaml`
