# Change Password™ API Guide

## Endpoint

```http
POST /api/v1/identity/change-password
```

## Purpose

Change the password for the currently authenticated identity using the current password and a new password.

Unlike Reset Password™, this operation requires an active authenticated session and verifies the existing password before replacing it.

## Request

```json
{
  "currentPassword": "CurrentPassword12345!",
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

Identity validates the change-password request, requires an authenticated identity, enforces the password policy for the new password, delegates current-password verification and password update mechanics to BetterAuth, records a credential lifecycle update, and emits `identity.credential_updated`.

The operation changes the credential belonging to the authenticated identity only. The caller cannot provide another identity or user identifier to select whose password is changed.

## Security Rules

Never return or persist:

* current password
* new password
* password hash
* credential secret
* provider token
* BetterAuth raw payloads
* authorization headers
* raw session credentials

The authenticated identity must be derived exclusively from the trusted Identity session context.

The request body must never be allowed to override the authenticated identity.

## Errors

Malformed request, missing current password, missing new password, or a new password that violates the password policy returns:

```text
400 invalid_request
```

Missing or invalid authentication session returns:

```text
401 authentication_required
```

Incorrect current password returns:

```text
401 invalid_current_password
```

The exact public error contract must remain transport-safe and must never expose BetterAuth errors, credential state, password hashes, stack traces, or internal persistence details.

## Event

Successful password change emits:

```text
identity.credential_updated
```

Payload:

```json
{
  "userId": "user_...",
  "credentialType": "password",
  "updatedAt": "2026-08-08T13:00:00.000Z",
  "reason": "password_change"
}
```

The event contains credential lifecycle metadata only.

It must never contain the current password, new password, password hash, session credentials, provider credentials, or any other authentication secret.
