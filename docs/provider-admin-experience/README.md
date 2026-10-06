# Saiwaly IAM™ Provider Admin Experience™

## Purpose

Provider Admin Experience™ is the provider-operator experience for Saiwaly IAM™. It gives authorized Provider operators a single operational surface to understand and administer Identity, Membership, Access, security, investigation, activity, configuration, and service health.

Its purpose is to make IAM operable without moving IAM authority into the application.

## Business value

Provider Admin Experience™ enables Provider operators to:

- understand the state of IAM from one experience;
- inspect identities and their tenant relationships;
- inspect roles, grants, restrictions, and effective access;
- investigate security and access questions without database access;
- perform supported identity-security operations;
- review IAM activity and correlated operational history;
- inspect Provider and tenant configuration;
- observe IAM operational metrics.

## Experience

The R8 experience contains these primary areas:

- **Overview** — operational entry point and IAM status.
- **Identities** — Provider-wide identity discovery and identity detail.
- **Memberships** — tenant relationship discovery and membership detail.
- **Access** — roles, assignments, direct permissions, restrictions, effective access, explanation, and impact.
- **Security** — identity security summary, sessions, suspension/reactivation, recovery, and authentication history.
- **Investigation** — search, timelines, and correlated IAM investigation.
- **Activity** — Provider-oriented IAM activity visibility.
- **Configuration** — Provider and tenant IAM configuration visibility and supported administration.
- **Metrics** — Provider and tenant IAM operational metrics.

## Authority model

Provider Admin Experience™ is an experience layer, not an IAM authority.

```text
Provider Admin Experience™
        ↓
       BFF
        ↓
Provider Admin APIs
        ↓
    Saiwaly IAM™
```

Authentication, Provider authorization, tenant isolation, lifecycle rules, access decisions, and security policy remain enforced by Saiwaly IAM™.

The application does not reproduce Identity, Membership, or Access business rules and UI visibility is never treated as authorization.

## Provider authentication

Provider operators sign in through the Provider Admin Experience using IAM Identity authentication. The BFF maintains the application session using HTTP-only session handling and calls IAM with the authenticated Provider context.

Access to the experience requires explicit Provider authority. Tenant authority alone never implies Provider authority.

## Initial Provider operator

A deployment needs an initial Provider operator before normal Provider administration can occur. R8 provides one hardened bootstrap mechanism for local, staging, and future production environments:

```text
pnpm iam:bootstrap-provider
```

The bootstrap uses normal IAM capability boundaries and is safe to rerun. It does not directly provision MongoDB state, expose a public bootstrap endpoint, or print the Provider password.

See [Provider Bootstrap](./provider-bootstrap.md).

## Security boundaries

R8 preserves these boundaries:

- IAM remains the source of truth for Identity → Membership → Access.
- Provider authority is explicit and backend-enforced.
- Tenant administration cannot grant Provider authority.
- Secrets, tokens, passwords, and internal credential identifiers are not exposed through Provider administration reads.
- Security operations execute through IAM APIs and use cases rather than direct state manipulation.
- Provider bootstrap is trusted deployment tooling, not a normal application endpoint.

## Current release boundary

R8 operates existing Provider identities, memberships, access, security, investigation, activity, configuration, and metrics and establishes the initial Provider operator through deployment bootstrap.

**Inviting an additional Provider operator and granting Provider administrative authorization is not part of this certified R8 baseline.** That lifecycle will be delivered as a bounded follow-up capability on top of the stable R8 release.

Bootstrap must not be used as the normal onboarding mechanism for every future Provider administrator.

## Release status

The R8 baseline has passed the local release gates, including Provider bootstrap, bootstrap rerun/idempotency, TypeScript typecheck, and IAM end-to-end certification.

Supporting documents:

- [Architecture](./architecture.md)
- [Local Development](./local-development.md)
- [Provider Bootstrap](./provider-bootstrap.md)
- [Staging Deployment](./staging-deployment.md)
