# Folksdo IAM™ — R1 Administration Read Foundation

## Purpose

R1 provides the administration read foundation required by Provider Admin and Tenant Admin experiences while preserving Identity → Membership → Access ownership. It is a read-only administration layer; it does not introduce a generic Admin capability or a new authoritative state store.

## Certified surfaces

### Provider Identity Search

Identity-owned provider directory with search, Identity status, email-verification filtering and bounded pagination. Provider authorization is explicit.

### Provider Membership Search

Membership-owned provider directory with optional tenant, identity, status, Membership type, lifecycle date-range and pagination filters. Filters are combinable for controlled provider discovery.

### Role Usage Queries

Access-owned Role Assignment queries provide roles-by-member, members-by-role and `total` assignment counts using the existing role-assignment read contract.

### Tenant People

`GET /api/v1/tenants/:tenantId/people` composes safe Identity summary, Membership, active roles and basic Access summary for the authorized tenant. It supports administration discovery controls including search, status and bounded pagination.

### Provider IAM 360

`GET /api/v1/admin/identities/:userId/iam-360` composes the provider-authorized Identity view across visible Membership relationships with roles, direct access, effective-access summary and a safe security/session summary.

### Tenant Person Detail

`GET /api/v1/tenants/:tenantId/people/:userId` returns the corresponding person detail constrained to one authorized tenant. Cross-tenant reads are denied.

## Security boundaries

- Provider authority and tenant authority are separate.
- Tenant authority does not grant provider directories or Provider IAM 360.
- Tenant People and Person Detail are tenant-bound and fail closed on cross-tenant access.
- Identity security/session administration exposes summary facts only; credentials, password material, session tokens and provider session identifiers are not exposed.
- Administration composition uses capability APIs/read contracts rather than direct cross-capability persistence access.

## Ownership

| Administration fact | Owner |
|---|---|
| Identity summary / verification / safe session summary | Identity Service™ |
| Membership and tenant relationship | Membership Service™ |
| Roles, direct access, authorization summary | Access Service™ |
| Cross-capability response composition | Thin IAM host |

The host owns transport composition only. It does not own Identity, Membership or Access truth.

## Certification

R1 is locally certified through the real IAM runtime with real MongoDB/NATS/Engine participation and the assembled Fastify HTTP boundary. The release-level E2E gate proves the five R1 administration capabilities together, including provider/tenant authority separation and cross-tenant denial.

Staging certification remains a separate release step and must run against the deployed immutable R1 image before promotion to production.
