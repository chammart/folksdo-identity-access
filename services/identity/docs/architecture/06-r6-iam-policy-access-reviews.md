# Folksdo IAM™ — R6 IAM Policy & Access Reviews

## Goal

Introduce governed IAM business configuration and recurring access governance while preserving capability ownership.

## Policy boundary

```text
Provider IAM Policy
        ↓
Allowed Tenant Choices
        ↓
Tenant IAM Settings
        ↓
Effective Runtime Policy
```

Provider policy is canonical IAM business state. Tenant settings are canonical only where Provider policy explicitly delegates control. Effective policy is derived and is never a second authoritative policy store.

Secrets, credentials, provider endpoints and infrastructure configuration remain runtime/deployment configuration and are not representable in Provider IAM Policy.

## Provider IAM Policy

Provider policy covers the governed business domains implemented in R6:

- authentication
- sessions
- verification
- invitations
- recovery
- security
- tenant delegation

Provider administration APIs:

- `GET /api/v1/admin/iam/policy`
- `PUT /api/v1/admin/iam/policy`

Canonical state: `iam_provider_policies`.
Canonical event: `iam.provider-policy.updated`.
Outbox subject: `iam.provider_policy.updated`.

## Tenant IAM Settings

Tenant settings may override only explicitly delegated fields:

- sessions: `maxActiveSessions`, `sessionLifetimeMinutes`
- invitations: `defaultExpiryHours`
- recovery: `recoveryRequestExpiryMinutes`

APIs:

- `GET /api/v1/tenants/:tenantId/iam/settings`
- `PUT /api/v1/tenants/:tenantId/iam/settings`
- `GET /api/v1/tenants/:tenantId/iam/effective-policy`

Canonical state: `iam_tenant_policies`.
Canonical event: `iam.tenant-policy.updated`.
Outbox subject: `iam.tenant_policy.updated`.

Tenant administration is strictly tenant-bound. Non-delegated and out-of-range settings fail validation.

When Provider policy is narrowed, a stored Tenant override that is no longer valid cannot widen the Provider boundary. Effective resolution falls back to the Provider value.

## Runtime enforcement

R6 connects effective invitation policy to real Membership execution. The IAM host resolves the target tenant's effective invitation default TTL and supplies that value at the Membership HTTP boundary. Membership then performs its existing canonical invitation creation.

This preserves ownership:

- IAM policy owns governed configuration.
- Membership owns invitation state and lifecycle.
- Access owns authorization.

## Access Reviews

Access Reviews are canonical governance workflow state over Access-owned facts.

Lifecycle:

```text
Create → Scope → Review → Confirm / Revoke → Complete
```

Supported review items are role assignments and direct permission assignments. Privileged reviews reuse the existing R2 privileged-access classification.

A revoke decision never mutates an assignment directly from the review workflow. It calls the existing canonical Access removal/revocation operation.

Persisted review decisions include the decision, actor, reason and decision time. Completion is recorded explicitly. Same-decision/same-reason retries are deterministic.

Review lifecycle events are replayable and use advancing aggregate versions.

## Release gate

> IAM supports continuous access governance and controlled tenant configuration while preserving Provider → Tenant policy boundaries and Identity → Membership → Access authority.
