# Verify Email™ API Guide

## Overview

**Verify Email™** verifies email ownership and activates a global Identity.

This flow completes the onboarding process initiated by **Invitation SignUp™**.

The API handles:

- validating verification request
- resolving pending email verification
- delegating token verification to authentication provider
- marking email verification as verified
- activating global user identity
- emitting replayable business events
- persisting outbox messages for downstream processing

---

# Endpoint

```http
POST /api/v1/identity/verify-email
```

---

# Purpose

Verify Email™ ensures that a user truly owns the email address associated with their global Identity.

This protects the platform against:

- fake identities
- mistyped email addresses
- unauthorized account activation
- invitation abuse

Successful verification transitions a user from:

```text
Pending
    ↓
Active
```

---

# Request

## Headers

```http
Content-Type: application/json
```

---

## Request Body

```json
{
  "token": "verification_token_here"
}
```

---

## Request Fields

| Field | Type   | Required | Description              |
| ----- | ------ | -------- | ------------------------ |
| token | string | Yes      | Email verification token |

---

# Success Response

## HTTP 200

```json
{
  "success": true,
  "message": "Email successfully verified."
}
```

Response shape may vary depending on current route implementation.

---

# Business Outcome

Successful Verify Email™ means:

```text
Email ownership verified
Email verification marked verified
User identity activated
Business events persisted
Outbox messages persisted
```

---

# State Changes

Verify Email™ commits the following state changes atomically.

## Email Verification Lifecycle

Before:

```text
pending
```

After:

```text
verified
```

---

## User Lifecycle

Before:

```text
pending
```

After:

```text
active
```

User state updates include:

- emailVerified = true
- status = active
- activation timestamp recorded

---

# Business Events

Verify Email™ emits replayable Identity business events.

---

## identity.user_email_verified

Triggered when email ownership is successfully verified.

Example payload:

```json
{
  "userId": "usr_123",
  "email": "john@example.com",
  "verifiedAt": "2026-07-02T12:00:00.000Z"
}
```

---

## identity.user_activated

Triggered when the global identity becomes active.

Example payload:

```json
{
  "userId": "usr_123",
  "activatedAt": "2026-07-02T12:00:00.000Z"
}
```

---

# Outbox Messages

The following outbox messages are persisted in the same atomic commit:

```text
identity.user_email_verified
identity.user_activated
```

These messages allow downstream services to react asynchronously.

Examples:

- onboarding workflows
- notification delivery
- audit logging
- analytics projections
- tenant membership provisioning

---

# Processing Model

The Verify Email™ flow remains service-owned.

```text
HTTP Route
    ↓
IdentityApi.verifyEmail(...)
    ↓
VerifyEmailUseCase
    ↓
Identity Read Store
    ↓
BetterAuthIdentityAdapter.verifyEmail(...)
    ↓
Engine state.commit(...)
    ↓
HTTP Response
```

Architecture rules:

- routes call only IdentityApi
- use case owns business orchestration
- engine owns atomic persistence

---

# Atomic Commit Guarantees

The Engine guarantees atomic persistence of:

## State Changes

- Email verification lifecycle update
- User lifecycle activation

## Business Events

- identity.user_email_verified
- identity.user_activated

## Outbox Messages

- identity.user_email_verified
- identity.user_activated

No partial writes are allowed.

---

# Validation Errors

## Malformed Request

### HTTP 400

Returned when DTO validation fails.

Example:

```json
{
  "error": "Invalid request payload"
}
```

Examples:

- missing token
- empty token
- malformed JSON

---

# Semantic Errors

Verify Email™ may reject valid HTTP requests for business reasons.

---

## Invalid Verification Token

Example:

```json
{
  "error": "Invalid verification token"
}
```

Possible causes:

- token does not exist
- token expired
- token tampered
- token already consumed

---

## Already Verified

Depending on current semantic rule, already verified identities may:

### Option A — Reject

```json
{
  "error": "Email already verified"
}
```

### Option B — Idempotent Success

```json
{
  "success": true
}
```

Implementation follows the current service rule.

---

# Security Considerations

Verify Email™ intentionally emits secret-safe events.

Events and outbox messages must never include:

- raw verification tokens
- password hashes
- provider secrets
- authentication credentials

Only replay-safe business data is persisted.

---

# Testing

Verify Email™ is validated through:

## Integration Tests

Validates:

- valid verification updates state
- email verified event persisted
- user activated event persisted
- outbox messages persisted
- invalid token rejected
- already verified behavior enforced

---

## E2E Tests

Current E2E focuses on:

- malformed request
- invalid token

Happy path E2E requires verification token capture support.

---

## Bruno Validation

Covers:

- malformed request
- invalid token
- happy path (when token capture available)

---

# Production Status

```text
Use Case 2 — Verify Email™
Status: PRODUCTION-GRADE COMPLETE
```
