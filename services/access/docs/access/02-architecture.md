# Access Service™ — Architecture

## Architectural position
Access is a service boundary inside Folksdo IAM™ and is composed by the standalone IAM server. It uses Folksdo Platform runtime services and Folksdo Engine for state/event/outbox persistence semantics.

## Internal architecture
The implementation is organized around:
- **API** — DTOs, validation, routes, HTTP mapping and route permissions.
- **Use cases** — permissions, roles, policies, restrictions, authorization queries, expirations, and authorization lifecycle.
- **Business rules** — deterministic domain transitions.
- **State** — Access-owned canonical aggregates/documents.
- **Authorization** — effective-permission resolution, precedence, policy evaluation and final decisions.
- **Known facts** — local projections of upstream lifecycle facts.
- **Reactions** — replayable Identity, Membership, Tenant and Subscription event consumers.
- **Read store** — Mongo-backed operational query model.
- **Runtime** — composition, indexes, workers, lifecycle and readiness.

## Request flow
`HTTP → authentication/context resolution → route authorization → validation → Access API → use case → business rule → Engine commit → state/event/outbox`

## Authorization flow
`actor + tenant/membership context + requested action/resource → known lifecycle facts → effective permissions → restrictions/policy → authorization decision`

## Runtime integration
The IAM server bootstraps Identity and Membership, then Access, binds Identity/Membership authorization ports to the Access API, starts Access workers, and includes Access readiness in `/health/ready`.

## Dependency rule
Access may consume upstream facts but does not mutate Identity, Membership, Tenant or Subscription-owned state. Cross-boundary synchronization is event-driven.


## R1 administration composition

The IAM host may compose Access read results with Identity and Membership for Tenant People and IAM 360. The host calls Access APIs/read contracts; it does not read Access MongoDB collections directly and does not become an authorization source of truth.

## R2 access-intelligence architecture

R2 extends the existing authorization path rather than adding a parallel evaluator:

`canonical Access facts → effective-permission resolver → authorization evaluator → administration reads`

Effective Access exposes the resolver facts required for administration. Access Explanation invokes the canonical authorization evaluator for the selected target Membership and permission. Access Summary aggregates the same Effective Access result. Privileged classification is a provider-owned policy applied to canonical Permission IDs, and role privilege is derived from role composition. Role Access Impact combines the existing role-usage/assignment reads with role permissions and privilege classification.

The IAM host may consume these Access reads for cross-capability administration projections, but it does not recompute effective permissions, explanation decisions, privilege, or impact.
