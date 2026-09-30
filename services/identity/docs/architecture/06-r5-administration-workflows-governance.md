# R5 — Administration Workflows & Governance

## Goal
Support major tenant IAM administration workflows while preserving the service ownership chain: Identity → Membership → Access.

## Membership-owned workflows
- Invitation reissue with token rotation and idempotency.
- Bounded bulk invitation creation with deterministic per-item outcomes.
- Optional `initialRoleId` intent persisted through invitation redemption and Membership activation.

## Access-owned workflows
- Apply initial role assignment after Membership activation.
- Clone Tenant Roles into independent canonical roles.
- Bulk Role Assignment and removal with per-item outcomes.
- Persist direct-access `justification` and `reviewAt` governance metadata.
- Query active direct-access exceptions with derived review status.

## Boundary
Membership never owns roles or assignments. Access does not own invitation or Membership lifecycle. Initial access is coordinated by replayable Membership activation facts and applied through the canonical Access assignment use case.

R5 governance metadata is intentionally lightweight. Recurring Access Review campaigns, decisions and review history belong to R6.

## Certification
`tests/e2e/foundation/iam-r5-administration-workflows-release-gate.e2e.test.ts` certifies the cross-capability workflow using real HTTP, Engine, MongoDB and NATS processing. The certified R5 source passes `pnpm typecheck` and `pnpm certify`.
