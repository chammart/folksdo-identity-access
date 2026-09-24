# Identity Service™ — API Contract

## Public Identity endpoints

| Method | Path | Success | Authentication |
|---|---|---:|---|
| POST | `/api/v1/identity/invitation-sign-up` | 201 | Invitation flow |
| POST | `/api/v1/identity/verify-email` | 200 | Verification token |
| POST | `/api/v1/identity/sign-in` | 200 | Credentials |
| POST | `/api/v1/identity/sign-out` | 200 | Session |
| GET | `/api/v1/identity/session` | 200 | Session |
| GET | `/api/v1/identity/me` | 200 | Session |
| POST | `/api/v1/identity/request-password-reset` | 200 | Public recovery flow |
| POST | `/api/v1/identity/reset-password` | 200 | Reset token |
| POST | `/api/v1/identity/change-password` | 200 | Authenticated identity |

## Provider/operator endpoints

| Method | Path | Success | Authorization |
|---|---|---:|---|
| GET | `/api/v1/identities` | 200 | `identity.identity.list` |
| GET | `/api/v1/identities/:userId` | 200 | `identity.identity.view` |

The list surface supports status filtering plus offset/limit pagination. Provider DTOs expose stable Identity fields, not BetterAuth identifiers.

## Core request/response contracts

### Invitation SignUp

Request: `invitationToken`, `email`, `password`, with optional `displayName`, `locale`, `timezone`.

Response: `userId`, `sessionId`, `status`, `emailVerificationRequired`.

### Verify Email

Request: `verificationId`, `verificationToken`.

Response: `userId`, `status: active`, `emailVerified: true`.

### Sign In

Request: `email`, `password`.

Response: `userId`, `email`, `sessionId`, `expiresAt`.

### Sign Out

Request: `sessionId`.

Response: `userId`, `sessionId`, `status: signed_out`, `endedAt`.

### Current Session

Response: `sessionId`, `userId`, `status: active`, `createdAt`, `expiresAt`.

### Current User

Response: `userId`, `email`, `status`, `emailVerified`, `createdAt`, `updatedAt`.

### Request Password Reset

Request: `email`.

Response: `passwordResetRequested: true`.

### Reset Password

Request: `token`, `newPassword`.

Response: `credentialUpdated: true`.

### Change Password

Request: `currentPassword`, `newPassword`, optional `revokeOtherSessions`.

Response: `credentialUpdated: true`, `otherSessionsRevoked`.

## Error contract

Errors use a stable envelope:

```json
{
  "error": {
    "code": "semantic_error_code",
    "message": "Production-safe message."
  }
}
```

Identity translates supported failures to 400, 401, 403, 404, 409, 410 or 500. Zod validation failures map to `400 validation_error`. Unknown failures map to a safe internal error rather than leaking raw exceptions.

## Contract rules

- DTOs do not expose BetterAuth concepts.
- DTOs do not expose provider identifiers.
- Customer Identity DTOs do not embed Membership or Access state.
- Authenticated actor selection comes from trusted runtime context where required.

## Source-of-truth implementation

- `services/identity/src/api/identity-fastify-routes.ts`
- `services/identity/src/api/identity-dtos.ts`
- `services/identity/src/api/identity-http-error-translator.ts`
- `services/identity/src/api/identity-route-validation.ts`
