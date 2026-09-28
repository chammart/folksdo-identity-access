# Current User™ API Guide

## Overview

**Current User™** returns the current authenticated user identity/profile associated with the active session.

The API handles:

- resolving the session reference from a safe request source
- validating the session exists
- validating the session is active and not expired
- resolving the associated Identity user
- validating user eligibility
- returning safe user profile data only

Current User™ does not resolve memberships, roles, permissions, tenant access, or authorization decisions.

It is a read-side use case and emits no business event by default.

---

# Endpoint

```http
GET /api/v1/identity/me
```

---

# Purpose

Current User™ gives authenticated clients a safe way to know who the current user is without leaking authorization data, provider secrets, credentials, or BetterAuth internals.

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
GET /api/v1/identity/me?sessionId=ses_001
```

---

# Successful Response

```http
200 OK
```

Example response:

```json
{
  "userId": "usr_sarah_001",
  "email": "sarah.carter@northriver.example",
  "status": "active",
  "emailVerified": true,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:30:00.000Z"
}
```

Response must not include:

- memberships
- roles
- permissions
- tenant access
- credentials
- password hashes
- provider tokens
- session secrets
- cookies
- authorization headers

---

# Business Flow

```text
Client requests current user
    ↓
Identity resolves safe session reference
    ↓
IdentityApi.getCurrentUser(...)
    ↓
GetCurrentUserUseCase resolves session
    ↓
Session is validated as active and not expired
    ↓
Identity user is resolved from session.userId
    ↓
User eligibility is validated
    ↓
Safe user response is returned
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

## Unknown User

```http
401 Unauthorized
```

```json
{
  "error": {
    "code": "user_not_found",
    "message": "User was not found."
  }
}
```

## Ineligible User

```http
403 Forbidden
```

```json
{
  "error": {
    "code": "user_not_eligible",
    "message": "User is not eligible for current user resolution."
  }
}
```

---

# NorthRiver Bank Scenario

Sarah Carter signs in to the platform.

Identity creates an active session and returns a `sessionId`.

Sarah Carter then requests:

```http
GET /api/v1/identity/me
```

Identity resolves the active session, resolves Sarah Carter’s user identity, and returns her safe profile only.

Memberships, roles, permissions, and tenant access decisions are excluded because they belong to Membership and Access.

---

# Bruno Validation Flow

Recommended validation:

```text
1. Sign in known verified user
2. Store returned sessionId as identityCurrentUserSessionId
3. GET /api/v1/identity/me with x-identity-session-id
4. Assert safe user profile is returned
5. Assert memberships, roles, permissions, and provider secrets are absent
```

Suggested variables:

```text
identityCurrentUserSessionId
identityCurrentUserId
identityCurrentUserEmail
```

---

# Final Status Target

```text
Use Case 6 — Current User™
Status: PRODUCTION-GRADE COMPLETE
```
