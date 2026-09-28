# Folksdo IAM™ — R2 Effective Access & Explanation

## Purpose

R2 turns the existing Access authority into administration-grade access intelligence while preserving the IAM ownership chain: Identity answers WHO, Membership answers WHERE, and Access remains authoritative for WHAT.

The R2 release gate is:

> **What can this person do, and why?**

## Certified Access surfaces

### Effective Access

`GET /api/v1/access/effective-access/:membershipId` exposes role-derived and direct permission candidates, Membership validity, effective dates, expiry and applicable active restrictions using the same effective-permission resolver that feeds runtime authorization.

### Access Explanation

`POST /api/v1/access/access-explanations/:membershipId` evaluates the requested canonical permission through the existing authorization evaluator. Its `allow`/`deny` decision, stable reason code and evidence describe the same authority used for enforcement.

### Access Summary

`GET /api/v1/access/access-summary/:membershipId` provides a compact administration projection derived from Effective Access: effective-permission, role, direct-permission, restriction and expiring-access counts plus privileged-access indicators.

### Privileged Access Classification

Privileged access is a provider-owned policy over canonical Permission IDs. It is separate from the existing Permission `classification` field. A role is privileged when its permission set contains a provider-classified privileged permission; role privilege is not independently persisted.

### Role Access Impact

`GET /api/v1/access/access-impact/roles/:roleId` provides read-only pre-change impact for a role: affected Memberships, assignments, permissions, privileged permissions and derived privileged-role status. It reuses Access-owned role/assignment facts and does not reserve or execute the consequential change.

## Consistency invariants

- Effective Access and runtime authorization use the same canonical Access facts.
- Access Explanation uses the canonical authorization evaluator rather than a second decision engine.
- Access Summary derives from Effective Access rather than persisted summary state.
- Privileged role status derives from permission classification policy.
- Access Impact remains a read and never becomes authoritative mutation state.
- Tenant-scoped administration reads fail closed on foreign-tenant targets.
- The IAM host may compose these results into administration experiences but does not own or recompute Access truth.

## Ownership

| R2 fact | Owner |
|---|---|
| Effective permission resolution | Access Service™ |
| Authorization decision / reason / evidence | Access Service™ |
| Access Summary | Access Service™ |
| Privileged permission policy and derived role privilege | Access Service™ |
| Role Access Impact | Access Service™ |
| Identity lifecycle facts | Identity Service™ |
| Membership / tenant relationship | Membership Service™ |
| Cross-capability response composition | Thin IAM host |

## Certification

R2 is locally certified through the real IAM runtime with Engine, MongoDB, NATS lifecycle reactions and the assembled HTTP boundary. The release-level gate proves effective access, explanation, summary, privileged classification, role impact, time-bound access behavior, restrictions and cross-tenant denial together.

Staging certification remains a separate release step against the deployed immutable R2 image before production promotion.
