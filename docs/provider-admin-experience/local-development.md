# Provider Admin Experience™ — Local Development

## Purpose

Local development provides the same IAM authority model used outside development while making infrastructure and the initial Provider operator easy to prepare.

## Local services

The repository owns dedicated local MongoDB and NATS infrastructure through `docker-compose.local.yml`. The local ports match the root development `.env` and are separate from the ports reserved for integration/E2E certification.

```text
Local development   → docker-compose.local.yml
Certification       → docker-compose.test.yml
Staging             → docker-compose.staging.yml
```

## Prepare the Provider operator

Run:

```text
pnpm dev:prepare-provider
```

The command prepares local infrastructure, ensures the MongoDB replica set has a writable primary, and invokes the canonical Provider bootstrap.

It is safe to run again. A rerun reconciles the existing Provider operator rather than intentionally creating a duplicate.

## Run IAM

The IAM development server loads the repository root `.env` through the existing development command:

```text
pnpm dev
```

## Run Provider Admin Experience

Run:

```text
pnpm dev:provider-admin
```

The Provider Admin application runs separately from the IAM server and communicates with IAM through its BFF.

## Local Provider credential

Local development may use the deterministic development Provider credential configured by the bootstrap defaults. That convenience does not create a separate local authorization model: Identity, Membership, and Access remain authoritative.

Do not reuse the local credential in staging or production.

## Local validation

The certified local release gate is:

```text
pnpm typecheck
pnpm dev:prepare-provider
pnpm dev:prepare-provider
pnpm test:e2e
```

The second Provider preparation verifies bootstrap idempotency.
