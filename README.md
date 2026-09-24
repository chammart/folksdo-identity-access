# Folksdo IAM™

Folksdo IAM™ is the standalone Identity and Access Management platform for Folksdo.

It establishes the security chain used to determine:

> **Who is the actor? → Where does the actor operate? → What may the actor do?**

## Services

| Service | Responsibility | README |
|---|---|---|
| **Identity Service™** | Authentication, credentials, verification, sessions, password lifecycle, and global Identity. | [Identity README](services/identity/README.md) |
| **Membership Service™** | Tenant participation, invitations, Membership lifecycle, and active Membership Context. | [Membership README](services/membership/README.md) |
| **Access Service™** | Permissions, roles, assignments, restrictions, effective authority, and authorization decisions. | [Access README](services/access/README.md) |

## Security Model

```text
Request
   ↓
Identity Service™
WHO is the actor?
   ↓
Membership Service™
WHERE is the actor operating?
   ↓
Access Service™
WHAT may the actor do?
   ↓
Authorized operation
```

Identity does not determine Tenant participation. Membership does not authenticate identities or grant permissions. Access does not own credentials or Membership lifecycle. Required authority is fail-closed.

## Repository Structure

```text
folksdo-identity-access/
├── apps/
│   └── server/
├── services/
│   ├── identity/
│   │   └── README.md
│   ├── membership/
│   │   └── README.md
│   └── access/
│       └── README.md
├── acceptance/
│   └── bruno/
│       └── Folksdo IAM/
├── docs/
│   ├── architecture/
│   ├── identity/
│   ├── membership/
│   └── access/
├── scripts/
└── README.md
```

## Architecture

The IAM host owns technical composition. Business behavior remains inside the owning service. Cross-service collaboration uses explicit contracts, authorization ports, and replayable business events rather than shared business ownership.

- [Folksdo IAM Architecture](docs/architecture/01-folksdo-iam-architecture.md)
- [Identity / Membership / Access Model](docs/architecture/02-identity-membership-access-model.md)

## Runtime

The server composes Platform Runtime + Identity + Membership + Access. The normal protected request chain is **Identity → Membership → Access**.

```text
GET /health/live
GET /health/ready
```

Readiness is fail-closed and requires the platform and authorization runtime dependencies required by IAM.

## Certification

Canonical repository certification:

```bash
pnpm certify
```

Canonical local IAM certification:

```bash
pnpm certification:local
```

Self-contained Bruno acceptance:

```text
acceptance/bruno/Folksdo IAM/01 - IAM
```

Release validation follows:

```text
Unit / Integration / Reaction / E2E
        ↓
Local Certification
        ↓
Staging Deployment
        ↓
Automated Staging Certification
        ↓
NorthRiver Bank™ QA
        ↓
Production Promotion
```

Only the exact immutable release certified and accepted in staging should be promoted.

## Documentation

Canonical service documentation lives under:

- [Identity documentation](docs/identity/)
- [Membership documentation](docs/membership/)
- [Access documentation](docs/access/)

The interactive IAM guide is the developer/integrator entry point. The NorthRiver Bank™ IAM QA guide is the human pre-production verification surface.

## Core Rule

```text
Identity establishes WHO.
Membership establishes WHERE.
Access establishes WHAT.

WHO → WHERE → WHAT
```
