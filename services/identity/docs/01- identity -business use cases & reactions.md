# Identity Service™ — Business Use Cases & Reactions Boundary

## Purpose

This document defines the business boundary of **Identity Service™** inside **Folksdo Operations™**.

It clarifies:

- what Identity Service owns
- which business use cases belong inside Identity
- which external events Identity reacts to
- which events Identity emits
- how Identity remains independent from other services

Identity Service™ is responsible for the lifecycle of a person’s identity, authentication access, session state, and identity verification.

Identity does **not** own tenant membership.

Identity does **not** own invitation lifecycle.

Identity collaborates with other services primarily through **event choreography**.

---

# Identity Service™ Business Responsibility

## Identity Service Owns

Identity Service owns:

- who the person is globally
- how the person authenticates
- whether the person’s email is verified
- whether the person can hold active identity sessions
- how identity lifecycle changes are recorded

## Identity Service Does Not Own

Identity Service does **not** own:

- which tenant the person belongs to
- which role the person has in a tenant
- who invited the person
- whether a membership is active
- billing access
- subscription access

Those belong to other services.

---

# Core Identity Concepts

Identity Service owns the following business concepts.

---

## User

Global identity record.

Represents a person known to the SaaS platform.

---

## User Profile

Global profile information.

Examples:

- display name
- locale
- timezone

---

## Credential

Business lifecycle record that an authentication method exists.

Identity does **not** store password hashes directly.

Authentication mechanics are delegated to external providers such as BetterAuth.

---

## Session

Business lifecycle record representing an authenticated session.

---

## Email Verification

Lifecycle record proving ownership of an email address.

---

## Known Invitation

Local Identity read model built from Membership invitation events.

Identity does **not** own invitation lifecycle.

It only keeps enough local invitation facts to verify signup independently.

---

# Identity Use Cases™

Use cases are business commands owned by Identity.

They are initiated through Identity APIs or internal command handlers.

Use cases commit Identity-owned state through **Folksdo Engine™**.

---

# Use Case 1 — Invitation SignUp™

## Purpose

Create or reuse a global Identity when a person signs up through an invitation.

## Trigger

```http
POST /api/v1/identity/invitation-sign-up
```

## Identity Owns

- validating signup input
- verifying invitation against local known-invitation read model
- enforcing invited email match
- creating or reusing global identity
- creating profile record
- creating credential lifecycle record
- creating session lifecycle record
- requesting email verification
- emitting Identity business events
- emitting invitation redemption request

## Identity Does Not Own

- creating the invitation
- deciding membership role
- creating tenant membership
- activating tenant membership

## Main Output

- User created or reused
- Session created
- Email verification requested
- InvitationRedemptionRequested emitted

**Status:** Production Grade Complete

---

# Use Case 2 — Verify Email™

## Purpose

Verify email ownership and activate global identity.

## Trigger

```http
POST /api/v1/identity/verify-email
```

## Identity Owns

- validating verification request
- resolving pending verification record
- verifying token with BetterAuth
- marking email verification as verified
- activating global identity
- emitting email verified event
- emitting user activated event

## Main Output

- Email verified
- User activated

---

# Use Case 3 — Sign In™

## Purpose

Authenticate a known user and establish a new active authenticated session.

Sign In™ allows an already registered and eligible identity to access protected capabilities inside Folksdo Operations™.

Sign In™ does **not** create identities.

Sign In™ does **not** create memberships.

It only authenticates an existing eligible identity and records the resulting session lifecycle.

## Trigger

```http
POST /api/v1/identity/sign-in
```

## Identity Owns

- accepting authentication requests
- validating request shape
- delegating credential authentication to BetterAuth
- resolving current identity eligibility
- rejecting ineligible identities
- creating active session lifecycle state
- emitting session creation business event
- persisting matching outbox message for downstream consumers

## Identity Does Not Own

- password hashing logic
- credential verification implementation
- authorization decisions
- tenant membership decisions
- tenant lifecycle decisions outside identity scope

## Core Concepts

Sign In™ involves:

- User
- Credential
- Session
- Authentication Attempt
- Authentication Provider

### Authentication Attempt

Authentication Attempt represents a single sign-in attempt against Identity Service.

It captures whether authentication succeeded, failed, or was blocked, together with security-relevant metadata needed for auditability, fraud detection, brute-force detection, account lockout policy, and regulatory compliance.

Typical attributes may include:

- attemptId
- email or normalized identifier
- outcome
- failureReason
- attemptedAt
- sourceIp
- userAgent
- correlationId

Current Sign In™ scope does not require full Authentication Attempt persistence, but the concept is part of the long-term Identity domain model.

## Business Rules

- Email must be present and valid.
- Password must be present and non-empty.
- Credentials must be validated by BetterAuth.
- Unknown users must be rejected without account enumeration.
- Inactive, suspended, archived, or unverified identities must not receive active sessions.
- Successful authentication must create an active session.
- Session state, replayable event, and outbox message must be committed atomically.
- Events and outbox payloads must contain no secrets.

## Main Output

- Authenticated session created
- Active session state persisted
- `identity.session_created` event persisted
- `identity.session_created` outbox message persisted

**Status:** Production Grade Complete

---

# Use Case 4 — Sign Out™

## Trigger

```http
POST /api/v1/identity/sign-out
```

## Purpose

End active session.

---

# Use Case 5 — Current Session™

## Trigger

```http
GET /api/v1/identity/session
```

## Purpose

Return current session.

---

# Use Case 6 — Current User™

## Trigger

```http
GET /api/v1/identity/me
```

## Purpose

Return current user identity.

---

# Use Case 7 — Request Password Reset™

## Trigger

```http
POST /api/v1/identity/request-password-reset
```

## Purpose

Start password reset flow.

---

# Use Case 8 — Reset Password™

## Trigger

```http
POST /api/v1/identity/reset-password
```

## Purpose

Complete password reset.

---

# Identity Reactions™

Reactions are event-driven behaviors owned by Identity.

Identity reactions never synchronously call other services.

---

## Reaction 1 — Known Invitation Created™

### External Event

```text
membership.invitation.created
```

### Purpose

Create or update local known invitation read model.

### Reaction

```text
RecordKnownInvitationReaction
```

### Updates

```text
identity_known_invitations
```

Stored facts:

- invitationId
- targetTenantId
- invitedEmail
- tokenHash
- status
- expiresAt

---

## Reaction 2 — Known Invitation Expired™

### Event

```text
membership.invitation.expired
```

### Reaction

```text
ExpireKnownInvitationReaction
```

Updates:

```text
status = expired
```

---

## Reaction 3 — Known Invitation Revoked™

### Event

```text
membership.invitation.revoked
```

### Reaction

```text
RevokeKnownInvitationReaction
```

Updates:

```text
status = revoked
```

---

## Reaction 4 — Known Invitation Redeemed™

### Event

```text
membership.invitation.redeemed
```

### Reaction

```text
MarkKnownInvitationRedeemedReaction
```

Updates:

```text
status = redeemed
```

---

## Reaction 5 — Tenant Suspended™

### Event

```text
tenant.suspended
```

### Purpose

Restrict active sessions.

---

## Reaction 6 — Tenant Archived™

### Event

```text
tenant.archived
```

### Purpose

Disable tenant-scoped access.

---

## Reaction 7 — Member Deactivated™

### Event

```text
membership.member.deactivated
```

### Purpose

Restrict tenant-scoped access.

---

## Reaction 8 — Security Policy Changed™

### Event

```text
access.security_policy.changed
```

### Purpose

Re-evaluate session validity.

---

# Events Emitted by Identity Service™

Identity emits events for other services.

- UserCreated
- UserProfileCreated
- CredentialAdded
- SessionCreated
- EmailVerificationRequested
- UserEmailVerified
- UserActivated
- InvitationRedemptionRequested

---

# Sign In™ Event Choreography

## During Sign In

```text
User calls sign-in API
        ↓
Identity delegates authentication to BetterAuth
        ↓
Identity validates eligibility
        ↓
Identity records active session
        ↓
Identity emits identity.session_created
        ↓
Identity persists identity.session_created outbox message
```

Downstream services may react asynchronously.

Identity does **not** call Membership, Access, Audit, Usage, Notification, or Security Monitoring synchronously during Sign In™.

---

# Invitation SignUp™ Event Choreography

## Before Signup

```text
Membership emits membership.invitation.created
        ↓
Identity reacts
        ↓
Known invitation stored locally
```

## During Signup

```text
User calls invitation signup API
        ↓
Identity verifies invitation locally
        ↓
Identity creates identity
        ↓
Identity emits invitation redemption request
```

## After Signup

```text
Membership reacts
        ↓
Membership redeems invitation
        ↓
Membership activates membership
        ↓
Membership emits membership.invitation.redeemed
        ↓
Identity marks invitation redeemed
```

---

# Identity Boundary Rules

Identity:

✅ may know verified invitation facts  
✅ may request invitation redemption  

Identity:

❌ may not own invitation lifecycle  
❌ may not create memberships  
❌ may not assign roles  
❌ may not activate memberships  

---

# Service Independence Rule

Identity must never synchronously call Membership during signup.

Instead:

```text
Membership events
      ↓
Identity reactions
      ↓
Local read model
      ↓
Independent signup validation
```

Benefits:

- service independence
- event choreography
- eventual consistency
- microservice readiness

---

# Final Identity Service Model

Identity Service consists of both:

## Use Cases

Direct commands:

- InvitationSignUp
- VerifyEmail
- SignIn
- SignOut
- CurrentSession
- CurrentUser
- RequestPasswordReset
- ResetPassword

## Reactions

Event-driven behaviors:

- RecordKnownInvitation
- ExpireKnownInvitation
- RevokeKnownInvitation
- MarkKnownInvitationRedeemed
- SuspendTenantIdentitySessions
- ArchiveTenantIdentityAccess
- RestrictMemberIdentityAccess
- ApplySecurityPolicyChange

Together these define Identity as a complete autonomous business service.
---

# Use Case 5 — Current Session™

## Purpose

Return the current authenticated session state.

Current Session™ confirms whether a session reference still represents active authenticated access.

## Trigger

```http
GET /api/v1/identity/session
```

## Identity Owns

- resolving current session
- validating active session state
- validating expiration
- returning safe session status
- hiding provider-specific auth details

## Identity Does Not Own

- authorization decisions
- membership resolution
- tenant access decisions
- provider internals

## Events

Current Session™ is read-side only.

No event or outbox message is emitted by default.

## Final Status Target

```text
Use Case 5 — Current Session™
Status: PRODUCTION-GRADE COMPLETE
```

---

# Use Case 6 — Current User™

## Purpose

Return the current authenticated user identity/profile.

Current User™ resolves the user associated with the active session and returns safe Identity-owned profile data only.

## Trigger

```http
GET /api/v1/identity/me
```

## Identity Owns

- resolving active session
- resolving associated user
- validating user eligibility
- returning safe user identity/profile
- excluding membership, roles, and permissions

## Identity Does Not Own

- membership decisions
- role decisions
- permission decisions
- tenant access decisions
- provider credential internals

## Events

Current User™ is read-side only.

No event or outbox message is emitted by default.

## Final Status Target

```text
Use Case 6 — Current User™
Status: PRODUCTION-GRADE COMPLETE
```
