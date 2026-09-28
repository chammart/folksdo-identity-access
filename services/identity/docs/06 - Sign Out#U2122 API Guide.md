# Sign Out™ API Guide

## Overview

**Sign Out™** ends an active authenticated session.

This flow is the session termination point for users who previously signed in and now want to end platform access for the current session.

The API handles:

- validating sign-out payload
- resolving the active Identity session
- delegating provider session revocation to BetterAuth
- marking the Identity-owned session as signed out
- emitting replayable `identity.session_ended` event
- persisting matching `identity.session_ended` outbox message

Sign Out™ does not delete users, identities, credentials, memberships, roles, or permissions.

---

# Endpoint

```http
POST /api/v1/identity/sign-out
```

---

# Purpose

Sign Out™ ensures active authenticated sessions can be safely ended while preserving a durable and replayable session lifecycle trail.

The use case supports:

## Active Session

If the referenced session exists and is active:

- revoke/end the provider session through BetterAuth
- mark the Identity session as signed out
- persist `identity.session_ended` event
- persist `identity.session_ended` outbox message
- return ended session response

## Unknown or Inactive Session

If the session is unknown, already ended, expired, or revoked:

- reject sign-out with a semantic session error
- create no new session state transition
- emit no duplicate `identity.session_ended` event
- persist no duplicate outbox message

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
  "sessionId": "ses_001"
}
```

---

## Request Fields

| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| sessionId | string | Yes      | Active Identity session id.    |

---

# Successful Response

```http
200 OK
```

Example response:

```json
{
  "sessionId": "ses_001",
  "userId": "usr_sarah_001",
  "status": "signed_out",
  "endedAt": "2026-07-02T13:30:00.000Z"
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
Client sends sign-out request
    ↓
Identity validates request
    ↓
Identity resolves active session
    ↓
Identity delegates provider session revocation to BetterAuth
    ↓
BetterAuth revokes provider session
    ↓
Identity marks session as signed_out
    ↓
Engine commits state + event + outbox atomically
    ↓
Ended session response returned
```

---

# State Changes

Successful Sign Out™ updates an existing active session.

```ts
{
    sessionId: string;
    userId: string;
    status: "signed_out";
    endedAt: string;
}
```

---

# Business Events

Sign Out™ emits one replayable Identity business event.

## identity.session_ended

```json
{
  "sessionId": "ses_001",
  "userId": "usr_sarah_001",
  "endedAt": "2026-07-02T13:30:00.000Z",
  "reason": "signed_out"
}
```

---

# Outbox Messages

Sign Out™ persists one matching outbox message.

```text
identity.session_ended
```

Payload matches the `identity.session_ended` event payload.

Downstream services may react asynchronously through event choreography.

---

# Error Scenarios

## Malformed Request

Examples:

- malformed JSON
- missing sessionId
- empty sessionId

Expected result:

```http
400 Bad Request
```

---

## Unknown Session

The referenced session does not exist.

Expected behavior:

- reject sign-out
- create no state transition
- emit no `identity.session_ended` event
- persist no outbox message

---

## Session Not Active

Examples:

- already signed out
- expired
- revoked

Expected behavior:

- reject or handle idempotently according to current business rule
- do not emit duplicate session-ended events

---

## Provider Revocation Failure

BetterAuth cannot revoke the provider session.

Expected behavior:

- fail before committing Identity session-ended state
- emit no event
- persist no outbox message

---

# Security Rules

Sign Out™ must never persist or publish:

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
02 - Identity/04 - Identity Sign Out
```

Scenarios:

- invalid body
- unknown session
- setup known verified sign-out user
- sign in known verified user for sign-out
- sign out active session

Expected variables:

```text
identitySignOutSessionId
identitySignOutUserId
identitySignOutEmail
identitySignOutPassword
```

---

# Test Baseline

Current verified Identity test baseline after Sign Out™:

```text
Test Suites: 9 passed
Tests:       33 passed
Failures:    0
```

---

# Production Status

```text
Use Case 4 — Sign Out™
Status: PRODUCTION-GRADE COMPLETE
```
