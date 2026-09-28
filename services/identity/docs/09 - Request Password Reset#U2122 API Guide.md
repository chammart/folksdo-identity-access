# Request Password Reset™ API Guide

## Endpoint

```http
POST /api/v1/identity/request-password-reset
```

## Purpose

Start password reset flow for an existing Identity user without revealing whether the email exists.

## Request

```json
{
  "email": "sarah.chen@northriverbank.com"
}
```

## Success Response

```json
{
  "passwordResetRequested": true
}
```

The response is intentionally generic for both known and unknown emails.

## Business Behavior

Identity validates the request, normalizes the email, safely resolves eligible user state, delegates reset-token mechanics to BetterAuth for known eligible users, and records `identity.password_reset_requested` with a secret-safe payload.

## Security Rules

Do not reveal whether an account exists.

Never return or persist:

- reset token
- provider token
- password
- password hash
- cookies
- authorization headers
- BetterAuth raw payloads

## Errors

Malformed request, missing email, or invalid email returns `400 invalid_request`.

Unknown emails return the same safe success response.

## Event

Known eligible users emit:

```text
identity.password_reset_requested
```

Payload:

```json
{
  "userId": "user_...",
  "email": "sarah.chen@northriverbank.com",
  "requestedAt": "2026-07-02T12:00:00.000Z"
}
```
