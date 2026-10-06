# Provider Admin Experience™ — Architecture

## Architectural position

Provider Admin Experience™ is the Provider-facing application for operating Saiwaly IAM™. It sits above IAM's Provider Admin APIs and does not become a fourth IAM authority.

```text
Provider Operator
       ↓
Provider Admin Experience™
       ↓
Application BFF
       ↓
Provider Admin APIs
       ↓
Saiwaly IAM™
       ↓
Identity → Membership → Access
```

## Responsibilities

The experience owns presentation, navigation, interaction flow, session-facing application behavior, and composition of Provider-oriented views.

Saiwaly IAM™ owns authentication, authorization, identity lifecycle, membership lifecycle, access policy and decisions, security operations, investigation facts, configuration authority, and operational IAM data.

The BFF adapts the experience to IAM APIs. It must not become a second implementation of IAM business rules.

## Authorization boundary

Provider access is enforced by IAM. An authenticated identity is not automatically a Provider operator, and Tenant authority does not confer Provider authority.

The experience may hide actions a user cannot perform, but this is presentation only. IAM must independently authorize every protected operation.

## Capability boundaries

The experience follows the core IAM model:

```text
Identity   → WHO is the person?
Membership → WHERE do they belong?
Access     → WHAT may they do?
```

Provider administration composes these capabilities for operational use without changing their ownership.

## Security and data exposure

Provider-facing responses are administration-safe views. They must not expose passwords, authentication tokens, password-reset tokens, Provider credential identifiers, internal session identifiers, or other secret material.

Security and investigation surfaces expose the information needed to operate IAM while preserving the internal authentication and credential boundary.

## Deployment relationship

Provider Admin Experience™ is independently deployable from the IAM server while depending on the Provider Admin API contract. Environment configuration identifies the IAM endpoint; environment-specific authority remains in IAM and deployment secrets, not in client-side configuration.
