# Folksdo IAM™ — Identity, Membership & Access Model

## The model

Folksdo IAM™ separates three questions that must not be collapsed into one authorization model.

| Capability | Question | Owns |
|---|---|---|
| Identity Service™ | Who is the actor? | Users, credentials, authentication, sessions, verification |
| Membership Service™ | Where is the actor operating? | Tenant membership, invitations, active membership context |
| Access Service™ | What may the actor do? | Roles, grants/denials, permissions, authorization decisions |

## Request flow

An authenticated request starts with Identity. A tenant-scoped request then resolves Membership context. A protected operation finally asks Access for an authorization decision.

This ordering prevents authentication, tenancy and authorization from becoming implicit or interchangeable.

## Cross-capability collaboration

Identity and Membership collaborate on invitation-led signup through events rather than shared ownership. Membership owns invitation lifecycle. Identity consumes Membership invitation lifecycle events to maintain a local known-invitation projection used during signup verification. Identity emits an invitation-redemption request after successful signup; Membership remains responsible for its own lifecycle response.

Identity provider/operator reads are additionally protected through Access authorization. The current Identity permissions are `identity.identity.list` and `identity.identity.view`. Tenant-administration Identity reads are separately tenant-bound; tenant administration authority must not be interpreted as provider authority.

## Administration composition

R1 administration experiences preserve the same ownership model:

- Identity supplies identity and safe security/session summary facts.
- Membership supplies tenant relationship/lifecycle facts.
- Access supplies roles, direct-access and effective-access summary facts.
- The IAM host composes Tenant People, Provider IAM 360 and Tenant Person Detail without becoming a fourth business capability or authoritative read store.

Provider IAM 360 may traverse relationships only under explicit provider authority. Tenant People and Tenant Person Detail are constrained to the authorized tenant and must deny cross-tenant reads.

## Boundary rule

A capability may depend on another capability's explicit API, authorization port or event contract, but it must not read or mutate another capability's internal state as if it owned that state.

## Source-of-truth implementation

- `apps/server/src/bootstrap/bootstrap-server.ts`
- `apps/server/src/authentication/`
- `apps/server/src/authorization/`
- `services/identity/src/runtime/register-identity-reactions.ts`
- `services/identity/src/authorization/identity-permissions.ts`

## R2 interpretation of WHAT

R2 expands the Access side of WHO → WHERE → WHAT with administration-grade intelligence. The effective-access resolver and authorization evaluator remain authoritative. Explanation describes that evaluator, Summary derives from effective access, privileged-role status derives from provider-owned privileged-permission policy, and role impact is a read-only projection of Access-owned facts.
