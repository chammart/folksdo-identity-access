# Invitation SignUp™ API Guide

## Overview

**Invitation SignUp™** allows a person to create or reuse a global Identity when signing up through an invitation.

This flow is the entry point for invited participants into the Folksdo Operations™ platform.

The API handles:

- validating invitation token
- validating signup payload
- resolving invitation
- creating or reusing global Identity
- creating pending email verification
- generating verification token
- emitting invitation-related business events
- persisting outbox messages for downstream processing

---

# Endpoint

```http
POST /api/v1/identity/invitation-sign-up
```

---

# Purpose

Invitation SignUp™ ensures a participant can safely enter the platform while preserving identity consistency.

The use case supports two scenarios:

## New Identity

If the invited email does not already exist:

- create new global user identity
- create pending email verification
- request email verification
- request invitation redemption after verification

## Existing Identity

If the invited email already belongs to an existing identity:

- reuse existing global identity
- create pending email verification if needed
- request invitation redemption after verification

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
  "invitationToken": "invite_abc123",
  "firstName": "John",
  "lastName": "Doe",
  "password": "StrongPassword123!"
}
```

---

## Request Fields

| Field           | Type   | Required | Description                        |
| --------------- | ------ | -------- | ---------------------------------- |
| invitationToken | string | Yes      | Invitation token received by email |
| firstName       | string | Yes      | Participant first name             |
| lastName        | string | Yes      | Participant last name              |
| password        | string | Yes      | Initial account password           |

---

# Success Response

## HTTP 200

```json
{
  "success": true,
  "message": "Invitation signup completed. Email verification required."
}
```

---

# Business Outcome

Successful Invitation SignUp™ means:

```text
Identity created or reused
Email verification created
Verification token generated
Business events persisted
Outbox messages persisted
```

---

# Business Events

Invitation SignUp™ emits replayable business events.

## identity.email_verification_requested

Triggered when email verification is required.

Example payload:

```json
{
  "userId": "usr_123",
  "email": "john@example.com",
  "verificationId": "verification_123"
}
```

---

## identity.invitation_redemption_requested

Triggered when invitation redemption is pending verification.

Example payload:

```json
{
  "userId": "usr_123",
  "invitationId": "inv_123"
}
```

---

# Outbox Messages

The following outbox messages are persisted atomically with state changes:

```text
identity.email_verification_requested
identity.invitation_redemption_requested
```

These allow downstream services to react asynchronously.

Example consumers:

- Email delivery service
- Notification service
- Audit service
- Analytics service

---

# Validation Errors

## Malformed Request

### HTTP 400

Returned when payload validation fails.

Example:

```json
{
  "error": "Invalid request payload"
}
```

Examples:

- missing invitationToken
- missing password
- malformed JSON

---

# Semantic Errors

Invitation SignUp™ may reject valid HTTP requests for business reasons.

Examples:

## Invalid Invitation Token

```json
{
  "error": "Invitation token is invalid"
}
```

---

## Invitation Expired

```json
{
  "error": "Invitation has expired"
}
```

---

## Invitation Already Redeemed

```json
{
  "error": "Invitation already redeemed"
}
```

---

# Processing Model

The flow remains service-owned.

```text
HTTP Route
    ↓
IdentityApi.invitationSignUp(...)
    ↓
InvitationSignUpUseCase
    ↓
Identity Read Store
    ↓
BetterAuth Identity Adapter
    ↓
Engine state.commit(...)
    ↓
HTTP Response
```

---

# Atomic Commit Guarantees

The Engine guarantees atomic persistence of:

## State Changes

- User identity
- Email verification lifecycle
- Invitation lifecycle updates

## Business Events

- identity.email_verification_requested
- identity.invitation_redemption_requested

## Outbox Messages

- identity.email_verification_requested
- identity.invitation_redemption_requested

No partial writes are allowed.

---

# Testing

Invitation SignUp™ is validated through:

## Integration Tests

Validates:

- new identity signup
- existing identity signup
- event persistence
- outbox persistence

## E2E Tests

Validates:

- HTTP route
- DTO validation
- semantic errors

## Bruno Validation

Covers:

- malformed request
- invalid invitation
- happy path

---

# Production Status

```text
Invitation SignUp™
Status: PRODUCTION-GRADE COMPLETE
```
