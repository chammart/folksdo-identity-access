# Folksdo IAM™ — R7 Managed Service Operations & Metrics

## Purpose

R7 completes the backend contracts needed to operate Folksdo IAM™ as an independently managed service before frontend delivery.

R7 does not create a new business authority. Identity owns WHO, Membership owns WHERE, Access owns WHAT, and the Engine remains the replayable event authority.

## Provider operational contracts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/iam/service` | Safe service identity, environment, version, capabilities and runtime dependency status |
| GET | `/api/v1/admin/iam/release` | Running release identity |
| GET | `/api/v1/admin/iam/metrics` | Provider-wide derived IAM operational metrics |
| GET | `/api/v1/admin/iam/status` | Composed service/release/health/readiness/processing status |
| GET | `/api/v1/admin/iam/audit-export` | Bounded Provider IAM administration activity export |

All Provider routes require authenticated Provider context and explicit Access authorization.

## Tenant operational contracts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/iam/metrics` | Tenant-scoped derived IAM metrics |
| GET | `/api/v1/tenants/:tenantId/iam/audit-export` | Tenant-scoped bounded IAM administration activity export |

Tenant routes require an active Membership in the requested tenant and explicit Access authorization. A Tenant administrator cannot borrow Provider authority or read another tenant.

## Operational metrics

The metrics projection reads existing canonical state and operational records. It does not persist a second metrics source of truth.

The certified response covers:

- identities: total, active, suspended;
- authentication lifecycle event count;
- active sessions;
- memberships: total, active;
- pending invitations;
- Access lifecycle events;
- active role assignments;
- active direct permission assignments;
- authorization denial facts where canonical denial events exist;
- Processing projection failure count.

The current Access runtime also owns low-cardinality in-memory authorization telemetry. R7 does not fabricate persisted denial counts from unrelated lifecycle events when a canonical denial fact is absent.

## Operational status

Provider status composes:

- service identity and capabilities;
- release identity;
- liveness;
- readiness and safe dependency state;
- pending/failed outbox count;
- bounded recent projection failure information.

Recent failure output is deliberately safe and excludes raw failure/event payloads.

## Administrative audit export

Audit export is a read over `engine_events`; there is no R7 audit database or duplicate event store.

Supported filters:

- `capability`;
- `eventType`;
- `actorId`;
- `from`;
- `to`;
- `limit`.

`limit` defaults to 100 and is bounded to 1–1000. Invalid limits and timestamps return the hardened `400 validation_error` contract.

Export rows include safe identifiers, event type/capability, occurrence time, resource, actor, tenant, request and correlation identifiers. Raw event payload and raw metadata are not returned.

## Release metadata

Local/integration environments may use local development release values. Staging deployment supplies the immutable staging image tag and source revision to the running service so `/api/v1/admin/iam/release` identifies the deployed release.

The staging certification workflow separately publishes the certified release artifact containing source commit, image tag/ref/digest and certification timestamp. Certification does not mutate the already-running immutable image.

## Release gate

R7 gate:

> Provider Admin and Tenant Admin backend contracts are production-ready and certified before frontend delivery.

Executable release gate:

`tests/e2e/foundation/iam-r7-managed-service-operations-release-gate.e2e.test.ts`
