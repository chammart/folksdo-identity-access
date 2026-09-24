# Access Service™ — Runtime, Testing & Certification

## Runtime
Access is composed by `services/access/src/runtime` and bootstrapped by the standalone IAM server. Runtime responsibilities include adapters, API/use-case composition, Mongo read store, indexes, reaction registrations, workers, lifecycle start/stop, observability and readiness.

Access readiness is part of IAM readiness. The IAM server is not ready when the Platform runtime is ready but Access runtime is unavailable.

## Verification layers
- **Unit/domain tests** verify business rules and authorization behavior.
- **Integration tests** execute against real infrastructure and service composition.
- **Reaction tests** verify replayable upstream-event choreography.
- **E2E tests** exercise the real Fastify HTTP boundary, authentication/context and Access authorization.
- **Repository certification** runs the hardened IAM verification contract before release.

Production-grade provider tests must use the real runtime contracts; HTTP mocks are not the certification baseline.

## Local certification
`pnpm certification:local` prepares deterministic IAM fixtures, starts the real local IAM runtime, verifies readiness and projects the Bruno local environment. The self-contained `01 - IAM` acceptance suite includes Access administrator authority and ordinary-member denial scenarios.

## Staging certification
Staging certification belongs to the IAM deployment pipeline. The staging deployment prepares release-bound fixtures and runs repository-owned certification against the deployed environment. Manual Bruno staging acceptance remains the final human acceptance surface.

## Operational rule
Local and staging certification are separate consumers of the same production contracts. Staging must not depend on a developer workstation or Folksdo Operations™.
