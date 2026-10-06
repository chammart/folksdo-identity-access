# Saiwaly IAM™ Provider Bootstrap Deployment Contract

## Release baseline

This contract is part of **R8 — Provider Admin Experience™** for **Saiwaly IAM™**, endorsed as **Saiwaly™ by Folksdo**. R8 adds the Provider operator experience over the existing IAM authority; it does not move Identity, Membership, or Access business rules into the application.

## Purpose

`pnpm iam:bootstrap-provider` is the single Provider-operator provisioning mechanism for local, staging, and production. It owns no HTTP bootstrap endpoint and performs no direct MongoDB provisioning writes. Membership and Access mutations are delegated to their normal service use cases so canonical state, replayable events, and outbox remain authoritative.

## Inputs

Local development may use the deterministic defaults below. Staging and production MUST supply explicit bootstrap inputs from the deployment/operator secret store.

| Input | Local default | Staging / Production |
|---|---|---|
| `IAM_PROVIDER_BOOTSTRAP_EMAIL` | `provider.admin@local.folksdo.test` | required secret/input |
| `IAM_PROVIDER_BOOTSTRAP_PASSWORD` | `LocalProvider!Password1` | required secret |
| `IAM_PROVIDER_BOOTSTRAP_TENANT_ID` | `tenant_local_provider` | required input |
| `IAM_PROVIDER_BOOTSTRAP_DISPLAY_NAME` | `Provider Administrator` | optional |
| `IAM_PROVIDER_BOOTSTRAP_LOCALE` | `en-CA` | optional |
| `IAM_PROVIDER_BOOTSTRAP_TIMEZONE` | `America/Toronto` | optional |

The password MUST NOT be committed, written to the persistent runtime `.env`, emitted in logs, or included in certification artifacts. Provider bootstrap inputs are deployment/operator inputs, not application configuration.

## Environment behavior

### Local

Run:

```text
pnpm iam:bootstrap-provider
```

`pnpm dev:prepare-provider` is the local convenience entry point. It may start the repository-owned local MongoDB/NATS infrastructure first, then delegates provisioning to the same environment-neutral `pnpm iam:bootstrap-provider` mechanism. The canonical bootstrap command itself MUST NOT start local Docker infrastructure because staging and production use it too.

### Staging

The staging deployment invokes the same command inside the immutable deployed IAM image. GitHub Environment secrets provide the Provider email/password/tenant for that invocation only. They are not persisted to the VPS `.env`.

Required staging GitHub Environment secrets:

```text
IAM_PROVIDER_BOOTSTRAP_EMAIL
IAM_PROVIDER_BOOTSTRAP_PASSWORD
IAM_PROVIDER_BOOTSTRAP_TENANT_ID
```

### Production

Production uses the same command and the same three required inputs from the production deployment/operator secret store. Production credentials MUST be independent from staging credentials.

The current production promotion workflow is not modified by this hardening patch because its checked-in deployment definition is not yet the IAM staging-style promotion path. When IAM production promotion is enabled, bootstrap is a post-deploy/pre-acceptance step using the immutable image and ephemeral secret injection, identical to staging.

## Idempotency and authority

A rerun with the same Provider identity and credential reconciles Provider Membership and Access grants rather than creating a second Provider operator. Existing permissions/assignments are treated as already satisfied by the service-owned bootstrap ports.

Bootstrap authority is deliberately non-networked. There is no unauthenticated bootstrap route. The trusted actor is `system:provider-bootstrap`; normal Provider administration after bootstrap remains subject to Identity → Membership → Access authorization.

## Provider operator boundary

Bootstrap establishes or reconciles the initial Provider operator required to operate the Provider Admin Experience. It is not a general Provider-user management API and MUST NOT become a public bootstrap route. Additional Provider operators must be established through an explicitly authorized IAM administration lifecycle when that capability is delivered.

## Fresh Provider identity verification

Provider bootstrap uses the normal Identity invitation-sign-up lifecycle. If the target email does not already identify an active verified Identity, Identity email verification remains authoritative. Bootstrap must not bypass verification or manufacture verified Identity state. Complete the normal email-verification step for that address, then rerun `pnpm iam:bootstrap-provider`; the rerun reconciles Membership and Access idempotently.

This rule is identical in local, staging, and production. Local's deterministic credential is convenience input only; it is not a different provisioning mechanism.

## Release gate

Before staging deployment, the R8 gate includes bootstrap hardening plus the Provider Admin Experience certification:

```text
pnpm typecheck
pnpm iam:bootstrap-provider
pnpm iam:bootstrap-provider   # idempotent rerun
pnpm test:e2e
```

Expected bootstrap output may identify environment, email, tenant, and successful credential configuration. It MUST NOT print the password or other secret/token material.
