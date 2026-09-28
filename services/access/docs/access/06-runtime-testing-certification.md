# Access Service™ — Runtime, Testing & Certification

## Runtime
Access is composed by `services/access/src/runtime` and bootstrapped by the standalone IAM server. Runtime responsibilities include adapters, API/use-case composition, Mongo read store, indexes, reaction registrations, workers, lifecycle start/stop, observability and readiness.

Access readiness is part of IAM readiness. The IAM server is not ready when the Platform runtime is ready but Access runtime is unavailable.

## Verification layers
- **Unit/domain tests** verify business rules and authorization behavior.
- **Integration tests** execute against real infrastructure and service composition.
- **Reaction tests** verify replayable upstream-event choreography.
- **E2E tests** exercise the real Fastify HTTP boundary, authentication/context and Access authorization, including role-usage filters/counts and tenant/provider administration boundaries.
- **Repository certification** runs the hardened IAM verification contract before release.

Production-grade provider tests must use the real runtime contracts; HTTP mocks are not the certification baseline. R1 release certification proves Role Usage Queries together with Tenant People, Provider IAM 360 and Tenant Person Detail.

## Local certification
`pnpm certification:local` prepares deterministic IAM fixtures, starts the real local IAM runtime, verifies readiness and projects the Bruno local environment. The self-contained `01 - IAM` acceptance suite includes Access administrator authority and ordinary-member denial scenarios.

## Staging certification
Staging certification belongs to the IAM deployment pipeline. The staging deployment prepares release-bound fixtures and runs repository-owned certification against the deployed environment. Manual Bruno staging acceptance remains the final human acceptance surface.

## Operational rule
Local and staging certification are separate consumers of the same production contracts. Staging must not depend on a developer workstation or Folksdo Operations™.

## R2 certification

R2 certification uses the real IAM runtime, Engine, MongoDB, NATS/reaction paths and Fastify HTTP boundary. The release gate creates a real Identity and Membership, waits for Access-known lifecycle facts, then proves the complete access-intelligence chain:

- role-derived and direct effective access;
- effective/expiry inclusion and exclusion;
- restriction facts and restriction-driven deny explanation;
- explanation decision/reason consistency with canonical authorization;
- summary consistency with effective access;
- privileged permission and derived privileged-role classification;
- role access impact;
- cross-tenant denial for R2 administration reads.

The release-level gate is `tests/e2e/foundation/iam-r2-effective-access-explanation.e2e.test.ts`. Patch-focused E2E coverage remains in `tests/e2e/access/access-effective-access.e2e.test.ts`.

R2 adds no new canonical state, business events or outbox stream. Certification therefore focuses on read consistency, authorization boundaries and reuse of existing lifecycle reactions.
