# Membership Service™ — Runtime, Testing & Certification

## Runtime Composition

Membership is composed through its service runtime and bootstrapped into the standalone Folksdo IAM™ server. Runtime composition provides Engine access, read-store persistence, authorization integration, reactions, workers, observability, and HTTP API registration.

The host remains thin. Membership business logic stays inside the Membership service.

## Test Layers

### Integration

Production-grade integration tests exercise Membership use cases against real infrastructure/runtime composition rather than HTTP mocks. Current coverage includes creation, invitation lifecycle, Membership lifecycle, context resolution/switching, provider and tenant reads, provider administration search/filter/lifecycle-range/pagination behavior, activation reactions, and external lifecycle reactions.

### E2E

IAM E2E tests verify Membership through the assembled Fastify application and the Identity → Membership → Access security chain. R1 release certification additionally proves Provider Membership Search and its participation in Provider IAM 360 and tenant People/Person Detail composition.

### Reaction Tests

Reaction behavior is verified against the real processing/event contracts, including invitation redemption, Identity activation, and lifecycle effects.

## Local Certification

Repository certification remains owned by the standalone IAM repository. The GREEN local workflow is prepared with:

```text
pnpm certification:local
```

It starts the local certification runtime, prepares deterministic IAM fixtures, projects the Bruno local environment, and exposes the real IAM API for acceptance.

The canonical Bruno collection is:

```text
acceptance/bruno/Folksdo IAM/01 - IAM
```

Membership acceptance participates in the self-contained IAM certification contract rather than depending on Folksdo Operations™.

## Repository Certification

The hardened repository verification contract is:

```text
pnpm certify
```

It must remain GREEN before deployment changes are promoted.

## Staging Certification

Staging certification is deployment-owned, not a developer-local substitute. The IAM deployment pipeline is responsible for:

1. Deploying the immutable IAM image.
2. Passing health/readiness.
3. Preparing release-bound deterministic staging fixtures.
4. Running automated staging certification against the deployed environment.
5. Producing a certified release identity.
6. Supporting final manual Bruno acceptance against staging.

Local certification and staging certification remain separate contracts.

## Operational Readiness

Membership is ready only when its runtime dependencies required by the assembled IAM server are ready. Certification must fail closed on unavailable dependencies, invalid authentication/context, broken authorization, or failed required business scenarios.

## R2 participation

Membership has no new R2 authority or mutation contract. R2 release certification creates and activates the target Membership through the real Membership capability and waits for the existing Membership → Access reaction before evaluating access. Effective Access therefore preserves Membership validity and tenant-context semantics rather than treating Access assignments alone as sufficient authority.

## R5 certification

R5 certification exercises invitation reissue, deterministic bulk invitation outcomes, initial-role intent persistence, Identity invitation acceptance, Membership activation and the resulting Access-owned role assignment through the real IAM HTTP/runtime/event path. The release gate also verifies retry safety and secret-safe invitation responses.

Release-level coverage: `tests/e2e/foundation/iam-r5-administration-workflows-release-gate.e2e.test.ts`.

