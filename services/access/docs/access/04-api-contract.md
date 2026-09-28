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
