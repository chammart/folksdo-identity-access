# Current Session™ API Guide

## Overview

**Current Session™** returns the current authenticated Identity session state.

This flow lets a client confirm that a session reference still represents active authenticated access.

The API handles:

- resolving the session reference from a safe request source
- validating the session exists
- validating the session is active
- validating the session is not expired
- returning safe session state only
- hiding BetterAuth/provider internals

Current Session™ does not create, refresh, revoke, or end sessions.

It is a read-side use case and emits no business event by default.

---

# Endpoint

```http
GET /api/v1/identity/session
```

---

# Purpose

Current Session™ gives authenticated clients a safe way to check their active session state without exposing provider cookies, tokens, session secrets, or BetterAuth internal data.

---

# Request

## Supported Session Reference Sources

Preferred header:

```http
x-identity-session-id: ses_001
```

Also supported by the route adapter:

```http
x-session-id: ses_001
Authorization: Bearer ses_001
```

Query-string support exists for controlled validation scenarios:

```http
GET /api/v1/identity/session?sessionId=ses_001
```

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
  "status": "active",
  "createdAt": "2026-07-02T13:00:00.000Z",
  "expiresAt": "2026-07-02T21:00:00.000Z"
}
```

Response must not include:

- provider session id
- provider token
- session secret
- cookies
- authorization headers
- BetterAuth raw payloads

---

# Business Flow

```text
Client requests current session
    ↓
Identity resolves safe session reference
    ↓
IdentityApi.getCurrentSession(...)
    ↓
GetCurrentSessionUseCase resolves session
    ↓
Session is validated as active and not expired
    ↓
Safe session response is returned
```

---

# Error Responses

## Missing Session Reference

```http
401 Unauthorized
```

```json
{
  "error": {
    "code": "authentication_session_required",
    "message": "Authentication session is required."
  }
}
```

## Unknown Session

```http
401 Unauthorized
```

```json
{
  "error": {
    "code": "session_not_found",
    "message": "Session was not found."
  }
}
```

## Inactive Session

```http
401 Unauthorized
```

```json
{
  "error": {
    "code": "session_not_active",
    "message": "Session is not active."
  }
}
```

## Expired Session

```http
401 Unauthorized
```

```json
{
  "error": {
    "code": "session_expired",
    "message": "Session has expired."
  }
}
```

---

# Bruno Validation Flow

Recommended validation:

```text
1. Sign in known verified user
2. Store returned sessionId as identityCurrentSessionId
3. GET /api/v1/identity/session with x-identity-session-id
4. Assert status is active
5. Assert provider secrets are absent
```

Suggested variable:

```text
identityCurrentSessionId
```

---

# Final Status Target

```text
Use Case 5 — Current Session™
Status: PRODUCTION-GRADE COMPLETE
```
