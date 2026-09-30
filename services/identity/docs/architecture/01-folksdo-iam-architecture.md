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
- Administration projections compose capability-owned reads; they are not authoritative state stores.
- Provider authority and tenant authority are distinct and explicit. Tenant administration never implies provider authority.
- Tenant administration reads fail closed outside the authorized tenant.

## R1 Administration Read Foundation

The locally certified R1 administration layer adds read composition without changing capability ownership:

- Provider Identity Search — Identity-owned.
- Provider Membership Search — Membership-owned.
- Role Usage Queries — Access-owned.
- Tenant People — host composition of Identity + Membership + Access, strictly tenant-authorized.
- Provider IAM 360 — host composition across authorized provider-visible Membership relationships.
- Tenant Person Detail — the same safe composition constrained to one authorized tenant.

The host does not persist an IAM 360 or People aggregate. It composes current capability-owned read contracts. R1 effective-access information is a summary of existing Access facts; detailed access explanation/provenance is outside the R1 contract.

## Source-of-truth implementation

Primary implementation references:

- `apps/server/src/bootstrap/bootstrap-server.ts`
- `services/identity/src/`
- `services/membership/src/`
- `services/access/src/`
- `pnpm-workspace.yaml`

## R2 access intelligence

R2 preserves the IAM authority chain. Identity continues to own WHO and Membership continues to own WHERE; Effective Access, Access Explanation, Access Summary, privileged-access classification and Access Impact are Access-owned WHAT reads. Cross-capability administration experiences may compose those reads but must not recompute Access decisions outside Access Service™.


## R7 managed service operations and metrics

R7 completes the backend operational surface required to run Folksdo IAM™ as an independently managed service. These contracts are host-owned administration projections over existing capability and runtime facts; they do not move Identity, Membership or Access authority into a new capability.

### Service and release information
Provider-authorized operations can identify the running IAM service, environment, version, capabilities, runtime status and immutable release identity through:

- `GET /api/v1/admin/iam/service`
- `GET /api/v1/admin/iam/release`

The response is intentionally infrastructure-safe. Connection strings, credentials, database names, broker subjects and secrets are not exposed.

### Operational metrics
R7 exposes derived operational intelligence without creating authoritative metrics state:

- `GET /api/v1/admin/iam/metrics`
- `GET /api/v1/tenants/:tenantId/iam/metrics`

Provider scope is explicit. Tenant scope requires an active Membership in the requested tenant plus Access authorization and cannot cross tenant boundaries. Metrics are derived from canonical IAM state, Engine events and Processing failure records.

### Operational status
`GET /api/v1/admin/iam/status` composes service identity, release identity, health, readiness, dependency status, Processing state and a bounded safe view of recent projection failures. Raw failure payloads and infrastructure configuration are not returned.

### Administrative audit export
R7 reuses the existing replayable IAM event authority rather than introducing another audit store:

- `GET /api/v1/admin/iam/audit-export`
- `GET /api/v1/tenants/:tenantId/iam/audit-export`

Exports support bounded filtering by capability, event type, actor and time range. The maximum result limit is 1000. Export rows contain safe activity facts only; raw event payload and raw metadata are not exported.

### R7 release gate
The R7 release gate proves the operational contracts through real HTTP, Identity sessions, Membership, Access, Engine and MongoDB. Provider and Tenant authority remain explicit and deny-by-default.
