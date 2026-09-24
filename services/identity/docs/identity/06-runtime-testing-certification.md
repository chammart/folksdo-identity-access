# Identity Service™ — Runtime, Testing & Certification

## Runtime composition

Identity is bootstrapped by the IAM server against Folksdo Platform Runtime™. Identity runtime composition owns use cases, synchronous API, authorization and reactions. Bootstrap owns MongoDB indexes/read stores, BetterAuth configuration, collection names, identifiers, outbox subjects and Fastify route registration.

Identity runtime configuration currently includes BetterAuth base URL/secret/trusted origins, invitation-signup session TTL, sign-in session TTL, email-verification TTL and acceptance-capture configuration.

## Persistence

Identity uses dedicated MongoDB collections for users, credentials, sessions, email verifications and known invitations. State mutation and replayable events are committed through Folksdo Engine rather than ad-hoc route persistence.

## Testing

Identity has real integration coverage for:

- Invitation SignUp
- Verify Email
- Sign In
- Sign Out
- Current Session
- Current User
- Request Password Reset
- Reset Password
- Change Password
- Provider identity get
- Provider identity list

IAM-level E2E certification additionally validates the Identity → Membership → Access chain through the real Fastify application/runtime.

## Local certification

The repository-owned command is:

```text
pnpm certification:local
```

Local certification prepares real local infrastructure and deterministic IAM fixtures, starts the real IAM runtime, verifies readiness, and projects the Bruno local environment. The canonical Bruno collection is `acceptance/bruno/Folksdo IAM/01 - IAM`.

The local certification baseline is independent from staging deployment and should not be modified to accommodate staging-only concerns.

## Repository certification

`pnpm certify` is the repository validation contract used before release work. It includes type checking, real-infrastructure tests/E2E and build according to the root package scripts.

## Staging certification

Staging certification is a deployment concern. The staging pipeline owns deployment, readiness, deterministic staging fixture preparation, release-bound certification and certified-release evidence. It must not depend on developer-local fixture state.

Bruno remains the manual acceptance surface using the same canonical IAM collection with an environment projected from staging certification facts.

## Readiness

IAM exposes:

- `GET /health/live` — process liveness.
- `GET /health/ready` — readiness of Platform Runtime and Access Runtime.

A `503 not_ready` response is correct when required runtime dependencies are not ready.

## Source-of-truth implementation

- `services/identity/tests/integration/`
- `tests/integration/`
- `tests/e2e/`
- `scripts/certification/`
- `acceptance/bruno/Folksdo IAM/`
- `apps/server/src/bootstrap/bootstrap-server.ts`
