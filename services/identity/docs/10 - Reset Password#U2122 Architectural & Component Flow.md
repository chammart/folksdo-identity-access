# Use Case 8 — Reset Password™
## Architectural & Component Flow

## 1. Purpose

Define how Reset Password™ is executed inside the Folksdo Operations™ Identity Service from HTTP request to safe success response.

## 2. Architectural Principle

```text
HTTP Route
    ↓
IdentityApi
    ↓
ResetPasswordUseCase
    ↓
BetterAuth Adapter
    ↓
Event Recording / Outbox
    ↓
Safe Response Mapping
    ↓
HTTP Response
```

The route does not perform business orchestration.

The use case owns business orchestration.

Credential mutation is delegated to BetterAuth.

## 3. Component Responsibilities

HTTP Route exposes `POST /api/v1/identity/reset-password`, validates HTTP input, resolves runtime context, calls `IdentityApi.resetPassword(...)`, and translates errors.

IdentityApi exposes the service-owned business API and delegates to `ResetPasswordUseCase`.

ResetPasswordUseCase validates token/password input, enforces password policy, delegates token validation and password update to BetterAuth, records `identity.credential_updated`, and returns a safe response.

BetterAuth Adapter owns provider credential update mechanics.

Event recorder/outbox owns business-safe credential lifecycle event persistence.

## 4. Component Flow

```text
Client
    ↓
POST /api/v1/identity/reset-password
    ↓
Identity Route
    ↓
IdentityApi.resetPassword(command)
    ↓
ResetPasswordUseCase.execute(command)
    ↓
Password policy validation
    ↓
BetterAuth validates token and updates credential
    ↓
Credential updated event recorded
    ↓
Safe response returned
```

## 5. Event & Outbox Contract

Successful reset emits `identity.credential_updated` and matching outbox message.

Never persist password, password hash, reset token, provider token, or credential secret.

## Final Architecture Target

Use Case 8 — Reset Password™  
Architectural Flow: APPROVED FOR IMPLEMENTATION
