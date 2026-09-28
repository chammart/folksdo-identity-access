# Sign In™ API Guide

## Overview

**Sign In™** authenticates a known eligible user and creates a new active session.

This flow is the authentication entry point for users who already completed invitation signup and email verification.

The API handles:

- validating sign-in payload
- delegating credential authentication to BetterAuth
- validating identity eligibility
- creating active session lifecycle state
- emitting replayable `identity.session_created` event
- persisting matching `identity.session_created` outbox message

Sign In™ does not create users, memberships, roles, or permissions.

---

# Endpoint

```http
POST /api/v1/identity/sign-in
```

---

# Purpose

Sign In™ ensures only known, active, verified, eligible identities can establish authenticated access to Folksdo Operations™.

The use case supports:

## Known Active Verified Identity

If the email and password authenticate successfully and the identity is eligible:

- create active session state
- persist `identity.session_created` event
- persist `identity.session_created` outbox message
- return authenticated session response

## Invalid or Ineligible Identity

If credentials are invalid or the identity is not eligible:

- reject sign-in
- create no active session
- emit no session-created business event
- persist no session-created outbox message

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
  "email": "sarah.carter@northriverbank.com",
  "password": "StrongPassword123!"
}
```

---

## Request Fields

| Field    | Type   | Required | Description                         |
| -------- | ------ | -------- | ----------------------------------- |
| email    | string | Yes      | User email address.                 |
| password | string | Yes      | User password handled by BetterAuth. |

---

# Successful Response

```http
200 OK
```

Example response:

```json
{
  "userId": "usr_sarah_001",
  "email": "sarah.carter@northriverbank.com",
  "sessionId": "ses_001",
  "expiresAt": "2026-07-02T13:00:00.000Z"
}
```

Response must not include:

- password
- password hash
- raw provider token
- session secret
- cookies
- authorization headers
- BetterAuth internal secrets

---

# Business Flow

```text
Client sends sign-in request
    ↓
Identity validates request
    ↓
Identity delegates authentication to BetterAuth
    ↓
BetterAuth validates credentials
    ↓
Identity resolves user eligibility
    ↓
Identity creates active session state
    ↓
Engine commits state + event + outbox atomically
    ↓
Authenticated session returned
```

---

# State Changes

Successful Sign In™ persists a new active session.

```ts
{
    sessionId: string;
    userId: string;
    status: "active";
    createdAt: string;
    expiresAt: string;
}
```

---

# Business Events

Sign In™ emits one replayable Identity business event.

## identity.session_created

```json
{
  "sessionId": "ses_001",
  "userId": "usr_sarah_001",
  "email": "sarah.carter@northriverbank.com",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "expiresAt": "2026-07-02T13:00:00.000Z"
}
```

---

# Outbox Messages

Sign In™ persists one matching outbox message.

```text
identity.session_created
```

Payload matches the `identity.session_created` event payload.

Downstream services may react asynchronously through event choreography.

---

# Error Scenarios

## Malformed Request

Examples:

- malformed JSON
- missing email
- invalid email
- missing password
- empty password

Expected result:

```http
400 Bad Request
```

---

## Invalid Credentials

Credentials do not authenticate.

Expected behavior:

- reject authentication
- do not leak whether account exists
- create no session
- emit no `identity.session_created` event

---

## Identity Not Eligible

Examples:

- unverified identity
- inactive identity
- suspended identity
- archived identity

Expected behavior:

- deny session creation
- return semantic authentication error

---

# Security Rules

Sign In™ must never persist or publish:

- password
- password hash
- provider token
- session secret
- cookies
- authorization headers
- BetterAuth internal secrets

---

# Bruno Validation

Bruno folder:

```text
02 - Identity/03 - Identity Sign In
```

Scenarios:

- invalid body
- invalid credentials
- valid known user

Expected variables:

```text
identitySignInEmail
identitySignInPassword
identityInvalidPassword
```

---

# Test Baseline

Current verified Identity test baseline after Sign In™:

```text
Test Suites: 7 passed
Tests:       26 passed
Failures:    0
```

---

# Production Status

```text
Use Case 3 — Sign In™
Status: PRODUCTION-GRADE COMPLETE
```
