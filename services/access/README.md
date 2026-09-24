# Access Service™

Access Service™ is the final authorization authority of Folksdo IAM™.

> **Access answers: What may the actor do?**

## Owns

- Permission definitions
- Roles
- Role assignments
- Direct permission assignments
- Restrictions and denial semantics
- Effective permission resolution
- Authorization decisions
- Access-owned lifecycle and authorization facts

Access does **not** own authentication credentials, Identity lifecycle, or Membership lifecycle.

## Authorization Model

```text
Authenticated Identity
        ↓
Resolved Membership Context
        ↓
Access evaluates authority
        ↓
ALLOW or DENY
```

Access is deny-by-default. A permission definition by itself does not grant authority. Effective authority must be established through valid Access-owned assignments and rules in trusted runtime context.

## Public API

Authorization is exposed through the Access HTTP boundary, including:

```text
POST /api/v1/access/authorize
```

The service also owns the HTTP surfaces for its permission catalog, roles, assignments, restrictions, and protected Access administration defined by the current API contract.

## Security Rules

- Missing authentication cannot become authorization.
- Missing or invalid Membership Context cannot become Tenant authority.
- Caller-supplied identifiers are not proof of authority.
- Explicit denial/restriction semantics take precedence according to the Access business rules.
- Cross-Tenant authority must fail closed.
- Revoked authority must converge to denial.

## Documentation

- [Capability & Domain Design](../../docs/access/01-capability-domain-design.md)
- [Architecture](../../docs/access/02-architecture.md)
- [Business Use Cases](../../docs/access/03-business-use-cases.md)
- [API Contract](../../docs/access/04-api-contract.md)
- [Events & Reactions](../../docs/access/05-events-reactions.md)
- [Runtime, Testing & Certification](../../docs/access/06-runtime-testing-certification.md)

## IAM Position

```text
Identity
  WHO
   ↓
Membership
 WHERE
   ↓
Access
 WHAT
```

Access consumes trusted actor and Membership context but remains the owner of the final authorization decision.
