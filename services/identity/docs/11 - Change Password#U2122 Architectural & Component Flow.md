# Use Case 8 — Reset Password™

## Architectural & Component Flow

## 1. Purpose

Define the production architectural flow for **Reset Password™** inside Folksdo Operations™ Identity Operations™.

Reset Password completes a previously initiated password-reset flow by validating the reset request, delegating credential mechanics to BetterAuth, recording the credential lifecycle change, and returning a safe service-owned response.

Public endpoint:

```text
POST /api/v1/identity/reset-password
```

Identity Operations™ owns the business operation.

BetterAuth owns the underlying authentication-provider credential mechanics.

---

## 2. Architectural Principle

Reset Password follows the standard Folksdo Operations™ service boundary:

```text
HTTP Request
    ↓
Identity HTTP Route
    ↓
IdentityApi
    ↓
ResetPasswordUseCase
    ↓
Password Policy Validation
    ↓
BetterAuth Adapter
    ↓
Credential Mutation
    ↓
Identity Event + Outbox Recording
    ↓
Safe Identity Response
    ↓
HTTP Response
```

The HTTP route does not perform business orchestration.

The IdentityApi does not implement credential mechanics.

The use case owns the business workflow.

BetterAuth owns reset-token validation and credential mutation mechanics.

Identity Operations™ owns the resulting business fact.

---

## 3. Ownership Boundaries

### Identity HTTP Route

The HTTP route owns transport concerns only.

It:

* exposes `POST /api/v1/identity/reset-password`
* validates the transport request
* resolves the trusted runtime context
* calls `IdentityApi.resetPassword(...)`
* translates known Identity errors into the public HTTP error contract
* returns the service-owned response

It does not:

* validate BetterAuth reset tokens directly
* update password hashes
* access BetterAuth credential persistence directly
* create Identity business events
* perform credential lifecycle orchestration

---

### IdentityApi

`IdentityApi` is the public application boundary for Identity Operations™.

For Reset Password it:

```text
IdentityApi.resetPassword(command, context)
    ↓
ResetPasswordUseCase.execute(command, context)
```

It does not duplicate Reset Password business rules.

It does not contain BetterAuth implementation details.

---

### ResetPasswordUseCase

`ResetPasswordUseCase` owns the Reset Password business orchestration.

It is responsible for:

1. receiving the validated Reset Password command
2. validating required business input
3. enforcing the Identity password policy
4. delegating reset-token validation to the BetterAuth adapter
5. delegating credential mutation to the BetterAuth adapter
6. recording the successful credential lifecycle change
7. emitting the replayable Identity business event
8. preparing the matching outbox message
9. returning a safe Identity-owned result

The use case must not implement provider-specific password hashing or credential-storage behavior.

---

### BetterAuth Adapter

The BetterAuth adapter owns authentication-provider mechanics.

For Reset Password it is responsible for:

* interpreting the provider reset token
* validating the reset token through BetterAuth
* rejecting invalid or expired reset credentials
* performing the actual password update
* returning only the information Identity Operations™ requires to complete its business workflow

BetterAuth implementation details must remain behind the adapter boundary.

Identity business code must not depend directly on BetterAuth persistence structures.

---

## 4. Component Flow

```text
Client
    ↓
POST /api/v1/identity/reset-password
    ↓
Identity Route
    ↓
Transport validation
    ↓
Trusted RuntimeContext resolution
    ↓
IdentityApi.resetPassword(...)
    ↓
ResetPasswordUseCase.execute(...)
    ↓
Validate Reset Password command
    ↓
Enforce password policy
    ↓
BetterAuth Adapter
    ↓
Validate reset token
    ↓
Update credential
    ↓
Credential mutation succeeds
    ↓
Prepare identity.credential_updated
    ↓
Prepare matching outbox message
    ↓
Record Identity business fact
    ↓
Map safe Identity result
    ↓
HTTP 200
```

---

## 5. Request Boundary

The Reset Password request contains only the information required to complete the reset operation.

Conceptually:

```text
{
    token,
    password
}
```

The exact public DTO remains owned by Identity Operations™.

The request must never accept trusted actor, tenant, request, correlation, or causation metadata from the client body.

Trusted execution metadata comes from `RuntimeContext`.

---

## 6. Password Policy

Password policy enforcement belongs to Identity Operations™.

Before credential mutation, the use case must validate the proposed password against the configured Identity password policy.

Provider mechanics and business password policy remain separate responsibilities.

```text
ResetPasswordUseCase
    ↓
Identity password policy
    ↓
BetterAuth credential operation
```

A password that violates the Identity password policy must be rejected before successful credential mutation is recorded.

---

## 7. Reset Token Boundary

Reset tokens are credential secrets.

Identity Operations™ may transport the token to the BetterAuth adapter as required to execute the reset, but the token must never become canonical Identity business state.

The reset token must never be:

* persisted in Identity canonical collections
* included in Identity events
* included in outbox messages
* written into business logs
* returned in API responses
* included in observability metadata

Reset-token interpretation and validation remain provider mechanics.

---

## 8. Credential Mutation

The password update itself is delegated to BetterAuth.

Conceptually:

```text
ResetPasswordUseCase
    ↓
BetterAuthIdentityAdapter.resetPassword(...)
    ↓
BetterAuth
    ↓
Credential updated
```

Identity Operations™ does not:

* generate password hashes
* compare password hashes
* persist provider credentials directly
* manipulate BetterAuth credential tables or collections
* expose BetterAuth credential structures through its API

---

## 9. Business Event

A successful password reset establishes a new Identity business fact:

```text
identity.credential_updated
```

The event communicates that the identity credential lifecycle changed.

It does not communicate the credential itself.

Conceptual payload:

```text
{
    identityId,
    credentialType: "password",
    occurredAt
}
```

The final payload must follow the existing Identity Operations™ event metadata and event-construction conventions.

---

## 10. Event & Outbox Contract

Successful Reset Password processing records:

```text
Identity state/business effect
        +
identity.credential_updated
        +
matching outbox message
```

where applicable through the existing Identity/Folksdo Engine™ commit boundary.

The matching outbox subject must use the canonical Identity subject configured by the Identity runtime.

The event and outbox payload must contain business-safe metadata only.

They must never contain:

```text
password
password hash
reset token
provider token
credential secret
BetterAuth internal credential record
session secret
authentication cookie
```

---

## 11. Failure Behavior

Reset Password must fail safely.

Expected failure categories include:

```text
Malformed request
        ↓
HTTP 400

Password policy violation
        ↓
Stable Identity validation/business error

Invalid or expired reset token
        ↓
Stable Identity reset-token error

Credential provider rejection
        ↓
Mapped Identity error

Unexpected infrastructure failure
        ↓
Safe Identity internal error
```

Provider exceptions must not leak directly through the public API.

Public errors must not expose:

* BetterAuth internals
* database information
* stack traces
* provider credential structures
* reset tokens
* password values
* password hashes

---

## 12. Success Contract

A successful password reset returns a safe Identity-owned result.

Conceptually:

```text
HTTP 200

{
    success: true
}
```

or the equivalent canonical Identity response already established by the service.

The response must not expose BetterAuth credential data.

---

## 13. Security Boundary

Reset Password is a credential-security operation.

The implementation must guarantee that sensitive credential material remains confined to the minimum execution boundary required to perform the operation.

```text
Client
    ↓
Transport DTO
    ↓
ResetPasswordUseCase
    ↓
BetterAuth Adapter
    ↓
BetterAuth
```

Sensitive credential values must not escape into:

```text
Identity canonical state
Folksdo Engine events
Outbox messages
Application logs
Metrics
Tracing attributes
Public API responses
Fixture manifests
```

---

## 14. Dependency Direction

The dependency direction remains:

```text
HTTP Route
    ↓
IdentityApi
    ↓
ResetPasswordUseCase
    ↓
Identity-owned abstractions
    ↓
BetterAuth Adapter
```

Business orchestration must not depend directly on BetterAuth implementation details.

The adapter translates between the Identity-owned contract and the authentication provider.

---

## 15. Architectural Non-Goals

Reset Password does not own:

* authentication session creation
* tenant membership
* tenant context selection
* authorization decisions
* invitation lifecycle
* password-reset email delivery
* provider credential persistence design
* BetterAuth token-generation mechanics

Those responsibilities remain with their appropriate service or infrastructure boundary.

---

## 16. Final Component Model

```text
POST /api/v1/identity/reset-password
                │
                ▼
        Identity HTTP Route
                │
                ▼
            IdentityApi
                │
                ▼
      ResetPasswordUseCase
          │             │
          │             └──────────────┐
          ▼                            ▼
 Password Policy              BetterAuth Adapter
                                      │
                                      ▼
                                  BetterAuth
                                      │
                                      ▼
                              Credential Updated
                                      │
                                      ▼
                        ResetPasswordUseCase
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
          identity.credential_updated          Outbox Message
                       │                             │
                       └──────────────┬──────────────┘
                                      ▼
                              Safe Identity Result
                                      │
                                      ▼
                                  HTTP 200
```

---

# Final Architecture Target

**Use Case 8 — Reset Password™**

```text
HTTP Route
    ↓
IdentityApi
    ↓
ResetPasswordUseCase
    ↓
Identity Password Policy
    ↓
BetterAuth Adapter
    ↓
Credential Mutation
    ↓
identity.credential_updated
    +
matching outbox message
    ↓
Safe Identity Response
```

### Ownership

**Identity Operations™ owns:**

* Reset Password business orchestration
* password-policy enforcement
* credential lifecycle business semantics
* `identity.credential_updated`
* public Reset Password API contract
* safe error translation

**BetterAuth owns:**

* reset-token mechanics
* reset-token validation
* password hashing
* provider credential mutation
* credential persistence mechanics

### Security Invariant

No password, password hash, reset token, provider token, credential secret, or authentication secret may be persisted in Identity business events, outbox messages, logs, observability metadata, or public responses.

## Status

**Use Case 8 — Reset Password™ Architectural Flow: APPROVED FOR IMPLEMENTATION**
