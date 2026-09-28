# Reset Password™ API Guide

## Endpoint

```http
POST /api/v1/identity/reset-password
```

## Purpose

Complete a password reset using a valid reset token and a new password.

## Request

```json
{
  "token": "reset-token-from-provider-flow",
  "newPassword": "NewPassword12345!"
}
```

## Success Response

```json
{
  "credentialUpdated": true
}
```

## Business Behavior

Identity validates the reset request, enforces the password policy, delegates reset-token validation and password update mechanics to BetterAuth, records a credential lifecycle update, and emits `identity.credential_updated`.

## Security Rules

Never return or persist:

- password
- password hash
- reset token
- provider token
- credential secret
- cookies
- authorization headers
- BetterAuth raw payloads

## Errors

Malformed request, missing token, missing password, or weak password returns `400 invalid_request` at the HTTP validation boundary.

Invalid or expired reset token returns `401 invalid_password_reset_token`.

## Event

Successful reset emits:

```text
identity.credential_updated
```

Payload:

```json
{
  "userId": "user_...",
  "credentialType": "password",
  "updatedAt": "2026-07-02T13:00:00.000Z",
  "reason": "password_reset"
}
```
