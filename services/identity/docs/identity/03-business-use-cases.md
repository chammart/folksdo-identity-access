# Identity Service™ — Business Use Cases

## Customer-facing use cases

### 1. Invitation SignUp™

Creates an identity from a valid Membership invitation. Identity verifies the local known-invitation projection, enforces invited-email matching, creates Identity-owned state and a session, initiates email verification when required, and emits the invitation-redemption request. Success returns `pending_email_verification` or `active`.

### 2. Verify Email™

Validates the verification ID/token, marks the email verified and activates the user when the lifecycle permits. Emits email-verified and user-activated facts.

### 3. Sign In™

Authenticates email/password through the provider boundary, verifies Identity eligibility, creates an Identity session and emits `identity.session_created`.

### 4. Sign Out™

Ends the requested active session, coordinates provider session revocation and emits `identity.session_ended`.

### 5. Current Session™

Returns the active session represented by the supplied authenticated session context. Missing, inactive or expired sessions are rejected.

### 6. Current User™

Returns the Identity user represented by the authenticated session. The result includes user ID, email, status, email-verification state and timestamps.

### 7. Request Password Reset™

Accepts an email address, coordinates password-reset initiation through the provider boundary and returns the non-enumerating acknowledgement `{ passwordResetRequested: true }` when accepted. The business fact `identity.password_reset_requested` is emitted when applicable.

### 8. Reset Password™

Uses a password-reset token to replace the credential. On success it returns `{ credentialUpdated: true }`, records the credential update and handles required session invalidation behavior.

### 9. Change Password™

Authenticated credential maintenance. The target identity comes from trusted runtime context. The caller supplies the current password, new password and optional `revokeOtherSessions` flag. The flag defaults to true. Successful completion returns whether other sessions were revoked.

## Provider/operator reads

Identity also exposes two protected operational reads: list identities and get identity by user ID. These are not part of the nine customer-facing lifecycle use cases. They require platform/provider security context and Access authorization.

## Cross-capability behavior

Invitation signup depends on Membership-owned invitation lifecycle facts but does not take ownership of Membership state. Identity's known-invitation projection is maintained asynchronously from Membership events.

## Source-of-truth implementation

- `services/identity/src/usecases/`
- `services/identity/src/api/identity-dtos.ts`
- `services/identity/tests/integration/`
