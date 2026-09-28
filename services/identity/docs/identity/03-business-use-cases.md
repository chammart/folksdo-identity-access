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

## Administration reads

Identity exposes protected administration reads in addition to the nine customer-facing lifecycle use cases.

### Provider Identity Search

The provider/operator identity directory supports controlled discovery by search, status, email-verification state and bounded pagination. Search matches the stable `userId` or email without exposing provider-specific identifiers. Provider authority is explicit and Access-authorized.

### Provider Identity Detail

Returns the safe Identity administration DTO for a specific user ID under `identity.identity.view`.

### Tenant Administration Identity Read

Provides the Identity-owned summary required by tenant People/Person Detail composition. Tenant authority is explicit and tenant-bound; this surface does not reuse provider authority.

### Administration Security/Session Summary

Provides a safe Identity-owned security/session summary for IAM 360 composition. It exposes summary facts only and does not expose credentials, password material, session tokens, provider session identifiers or other authentication secrets.

## Cross-capability behavior

Invitation signup depends on Membership-owned invitation lifecycle facts but does not take ownership of Membership state. Identity's known-invitation projection is maintained asynchronously from Membership events.

## Source-of-truth implementation

- `services/identity/src/usecases/`
- `services/identity/src/api/identity-dtos.ts`
- `services/identity/tests/integration/`

## R3 — Identity Security Administration™

R3 adds Provider Admin security operations for session administration, provider-initiated recovery, Identity suspension/reactivation, Security Summary, and Identity-owned authentication/security history. These operations remain inside Identity ownership and use explicit Provider authority.
