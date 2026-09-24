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

Identity provider/operator reads are additionally protected through Access authorization. The current Identity permissions are `identity.identity.list` and `identity.identity.view`.

## Boundary rule

A capability may depend on another capability's explicit API, authorization port or event contract, but it must not read or mutate another capability's internal state as if it owned that state.

## Source-of-truth implementation

- `apps/server/src/bootstrap/bootstrap-server.ts`
- `apps/server/src/authentication/`
- `apps/server/src/authorization/`
- `services/identity/src/runtime/register-identity-reactions.ts`
- `services/identity/src/authorization/identity-permissions.ts`
