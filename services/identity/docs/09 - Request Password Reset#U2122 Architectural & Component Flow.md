# Use Case 7 — Request Password Reset™
## Architectural & Component Flow

## 1. Purpose

Define how Request Password Reset™ is executed inside the Folksdo Operations™ Identity Service from HTTP request to safe generic response.

## 2. Architectural Principle

```text
HTTP Route
    ↓
IdentityApi
    ↓
RequestPasswordResetUseCase
    ↓
Identity Read Store
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

## 3. Component Responsibilities

HTTP Route exposes `POST /api/v1/identity/request-password-reset`, validates HTTP input, resolves runtime context, calls `IdentityApi.requestPasswordReset(...)`, and translates errors.

IdentityApi exposes the service-owned business API and delegates to `RequestPasswordResetUseCase`.

RequestPasswordResetUseCase normalizes email, safely resolves eligible user state, prevents account enumeration, delegates reset-token mechanics to BetterAuth, records `identity.password_reset_requested`, and returns a safe response.

BetterAuth Adapter owns provider reset-token mechanics.

Event recorder/outbox owns business-safe event persistence.

## 4. Component Flow

```text
Client
    ↓
POST /api/v1/identity/request-password-reset
    ↓
Identity Route
    ↓
IdentityApi.requestPasswordReset(command)
    ↓
RequestPasswordResetUseCase.execute(command)
    ↓
User eligibility resolved safely
    ↓
BetterAuth reset request delegated for known eligible user
    ↓
Password reset requested event recorded
    ↓
Safe response returned
```

## 5. Event & Outbox Contract

Known eligible users emit `identity.password_reset_requested` and matching outbox message.

Unknown or ineligible users return the same safe response and do not emit by default.

## Final Architecture Target

Use Case 7 — Request Password Reset™  
Architectural Flow: APPROVED FOR IMPLEMENTATION
