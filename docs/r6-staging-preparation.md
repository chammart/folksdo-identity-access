# Folksdo IAM™ — R6 Staging Preparation

## Certified local baseline

R6 — IAM Policy & Access Reviews has passed the repository gate:

```bash
pnpm typecheck
pnpm certify
```

R6 contains four certified increments:

1. Provider IAM Policy Foundation
2. Tenant IAM Settings & Policy Boundary Enforcement
3. Access Reviews & Privileged Access Reviews
4. Cross-Capability Certification & Release Gate

## Commit and push

Commit the final release-gate and documentation changes locally, then push the complete R6 release to `develop`. Do not deploy individual R6 patches.

Suggested commits:

```bash
git add .
git commit -m "feat(iam): certify R6 policy and access reviews"

git add .
git commit -m "docs(iam): document R6 policy and access review governance"
```

Then push the complete certified release:

```bash
git push origin develop
```

## Staging deployment contract

The existing `deploy-staging.yml` workflow is triggered by a push to `develop` or manual dispatch. It:

1. checks out IAM, Folksdo Platform and Folksdo Engine;
2. installs with frozen lockfiles;
3. builds Engine and Platform;
4. prepares `.env.test`;
5. runs `pnpm certify`;
6. builds and publishes immutable `ghcr.io/chammart/folksdo-identity-access:staging-<commit>`;
7. deploys that immutable image to staging;
8. waits for `/health/live` and `/health/ready`;
9. runs the repository staging preparation/certification flow defined by the workflow.

Staging IAM base URL remains:

`https://iam.staging.saiwaly.folksdo.com`

## R6 staging evidence

Do not promote until staging proves the deployed immutable image and R6 behavior:

- Provider policy read/update.
- Tenant delegated settings read/update.
- non-delegated and out-of-range settings rejected.
- cross-tenant settings access denied.
- effective invitation TTL affects real Membership invitation creation.
- Provider narrowing cannot be widened by stale Tenant overrides.
- Access Review creation/read/decision/completion.
- privileged review scope.
- confirm and revoke behavior.
- actor/reason persisted.
- retry-safe decision behavior.
- canonical state + event + outbox.
- existing IAM regression suite remains green.
- no unexpected 5xx or authority leak.

## Promotion rule

Staging certification must run against the exact immutable image produced from the certified `develop` commit. Production promotion must promote that exact certified image; production must not rebuild it.
