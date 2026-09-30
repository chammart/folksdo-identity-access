# Folksdo IAM™ — R7 Staging Preparation

## Certified local baseline

R7 Managed Service Operations & Metrics is locally certified through four bounded patches:

1. Service, Release & Dependency Information.
2. IAM Operational Metrics.
3. IAM Operational Status & Administrative Audit Export.
4. Cross-Capability Certification & Release Gate.

Local release gate: `pnpm typecheck` and `pnpm certify` GREEN.

## Staging release identity

The existing staging workflow builds one immutable image:

`staging-${GITHUB_SHA::12}`

R7 staging composition receives:

- `IAM_ENVIRONMENT=staging`
- `IAM_RELEASE_VERSION=staging`
- `IAM_RELEASE_ID=<immutable image tag>`
- `IAM_SOURCE_REVISION=<GitHub source SHA>`

The certification workflow publishes a separate certified-release artifact with the exact source commit, image tag, image ref, image digest and certification timestamp.

## Deployment sequence

1. Commit the complete R7 release locally.
2. Push the complete release to `develop`.
3. CI runs repository certification.
4. CI builds and publishes the immutable image.
5. Deploy that exact image to staging.
6. Verify liveness and readiness.
7. Prepare release-bound staging certification fixtures.
8. Run `pnpm staging:certify` against the deployed release.
9. Publish the certified-release identity artifact.
10. Promote only the exact certified image after staging acceptance.

## R7 staging evidence

Staging acceptance must verify the deployed operational contracts, especially:

- `/api/v1/admin/iam/service`
- `/api/v1/admin/iam/release`
- `/api/v1/admin/iam/metrics`
- `/api/v1/admin/iam/status`
- `/api/v1/admin/iam/audit-export`
- tenant metrics and audit-export isolation
- `/health/live`
- `/health/ready`

Do not rebuild for production. Promote the exact staging-certified image.
