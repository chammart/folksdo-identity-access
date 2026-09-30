# Access Service™ — API Contract

## Prefix
`/api/v1/access`

All administrative endpoints require authenticated context and the canonical Access administrative permission defined by the route contract. Authorization remains deny-by-default.

| Method | Path | Success | Purpose |
|---|---|---:|---|
| POST | `/permissions` | 201 | Create permission |
| GET | `/permissions/:permissionId` | 200 | Get permission |
| GET | `/permissions` | 200 | List permissions |
| POST | `/roles` | 201 | Create role |
| GET | `/roles/:roleId` | 200 | Get role |
| GET | `/roles` | 200 | List roles |
| PATCH | `/roles/:roleId` | 200 | Update role |
| POST | `/roles/:roleId/archive` | 200 | Archive role |
| POST | `/roles/:roleId/restore` | 200 | Restore role |
| POST | `/role-assignments` | 201 | Assign role |
| POST | `/role-assignments/:assignmentId/remove` | 200 | Remove role assignment |
| GET | `/role-assignments` | 200 | List role assignments |
| POST | `/permission-assignments` | 201 | Grant permission |
| POST | `/permission-assignments/:assignmentId/revoke` | 200 | Revoke permission |
| GET | `/permission-assignments` | 200 | List permission assignments |
| POST | `/policies` | 201 | Create policy |
| GET | `/policies` | 200 | List policies |
| PATCH | `/policies/:policyId` | 200 | Update policy |
| POST | `/policies/:policyId/archive` | 200 | Archive policy |
| POST | `/restrictions` | 201 | Create restriction |
| POST | `/restrictions/:restrictionId/remove` | 200 | Remove restriction |
| GET | `/restrictions` | 200 | List restrictions |
| GET | `/effective-access/:membershipId` | 200 | Get administration-grade effective access |
| POST | `/access-explanations/:membershipId` | 200 | Explain an Access decision for a target Membership |
| GET | `/access-summary/:membershipId` | 200 | Get compact Access summary |
| GET | `/access-impact/roles/:roleId` | 200 | Get read-only role access impact |
| POST | `/authorize` | 200 | Evaluate authorization |

## Role assignment administration query

`GET /role-assignments` is the Access-owned role-usage read surface. Its administration query supports the existing assignment selectors and controls, including:

- `roleId` — members/assignments using a role.
- `membershipId` — roles assigned to a Membership.
- `identityId` — roles for an Identity, resolved through Access-known Membership facts rather than treating Identity ID as Role Assignment state.
- assignment `status` and expiry-related filters defined by the executable DTO.
- `sortBy` / `sortDirection`.
- `offset` / `limit`.

The paged result includes `total`, allowing role assignment/usage counts before consequential role lifecycle changes. Tenant execution remains forcibly tenant-bound. Provider/platform execution requires its explicit authority and may query across tenants only where the route contract permits it.

HTTP pagination query values are parsed from canonical non-negative integer strings before numeric bounds are applied.

## HTTP contract principles
- Validation failures map to the repository validation error contract.
- Missing authentication is rejected before protected business execution.
- Insufficient authority is rejected with forbidden semantics.
- Resource and lifecycle conflicts are translated by Access HTTP error mapping.
- DTO and query schemas in `services/access/src/api/dto` and `validation` are the executable source of truth for field-level contracts.


## R2 administration read contracts

### Effective Access
`GET /effective-access/:membershipId` exposes the target Membership's effective Access facts using the same resolver that feeds runtime authorization. The result includes Membership/Identity/Tenant identity, Membership validity, effective permission candidates, their role/direct source and source assignment, effective/expiry dates, applicable active restrictions and evaluation time.

### Access Explanation
`POST /access-explanations/:membershipId` accepts the canonical permission key (`service`, `resource`, `action`) and evaluates it for the selected target Membership through the canonical authorization evaluator. The response returns the resulting decision, stable reason code and evidence. Explanation is therefore descriptive of enforcement, not a second policy engine.

### Access Summary
`GET /access-summary/:membershipId` derives compact administration counts from Effective Access, including effective permissions, roles, direct permissions, restrictions, expiring access, privileged permission count and `hasPrivilegedAccess`.

### Role Access Impact
`GET /access-impact/roles/:roleId` returns read-only pre-change impact for the selected role: affected Membership IDs, assignment IDs, permission IDs, privileged permission IDs and whether the role is privileged. Role privilege is derived from provider-owned privileged-permission classification.

All four reads remain tenant-authorized and fail closed on foreign-tenant targets. Their route permissions are canonical Access administrative permissions.

## R6 Access Review contracts

Access Review administration is tenant-scoped and deny-by-default.

| Method | Path | Success | Purpose |
|---|---|---:|---|
| POST | `/api/v1/access/reviews` | 201 | Create an Access or privileged Access review |
| GET | `/api/v1/access/reviews/:reviewId` | 200 | Read a review and persisted decisions |
| POST | `/api/v1/access/reviews/:reviewId/items/:itemId/decision` | 200 | Confirm or revoke a review item with reason |
| POST | `/api/v1/access/reviews/:reviewId/complete` | 200 | Complete a fully decided review |

Canonical administrative permissions are:

- `access.review.create`
- `access.review.view`
- `access.review.decide`
- `access.review.complete`

Review items snapshot active Access facts for role assignments and direct permission assignments. Privileged reviews include only items classified as privileged by the existing R2 privileged-access classification.

A `confirm` decision records governance history without changing the underlying assignment. A `revoke` decision delegates to the existing canonical Access role-removal or permission-revocation operation. Repeating the same decision with the same reason is retry-safe; a conflicting second decision is rejected.

Review lifecycle changes are committed through Folksdo Engine™ as canonical review state plus replayable event plus outbox. Event versions advance with the review lifecycle.
