# Identity Service™

Identity Service™ owns global identity, authentication onboarding, email verification, credential lifecycle records, and session lifecycle records for Folksdo Operations™.

It does **not** own tenant membership, invitation issuance, tenant role assignment, or membership activation.

Identity collaborates with other services primarily through event choreography.

---

## Business Boundary

Identity owns:

```text
Who the person is globally.
How the person authenticates.
Whether the person’s email is verified.
Whether the person has active identity sessions.
```

Identity does not own:

```text
Who invited the person.
Which tenant role the person receives.
Whether tenant membership is active.
Tenant membership lifecycle.
```

Those belong to Membership Service™.

---

## Main Use Cases

```text
Invitation SignUp™
Verify Email™
Sign In™
Sign Out™
Current Session™
Current User™
Request Password Reset™
Reset Password™
```

---

## Main Reactions

Identity reacts to Membership invitation lifecycle events:

```text
membership.invitation.created
membership.invitation.expired
membership.invitation.revoked
membership.invitation.redeemed
```

These reactions keep Identity’s local known-invitation read model aligned.

---

## Component Architecture

```text
services/identity/src/
  api/
  adapters/
    better-auth/
  business-rules/
  errors/
  events/
  known-invitations/
  reactions/
  read-store/
  runtime/
  state/
  usecases/
```

### API Layer

Owns HTTP route adapters, request validation, context resolution, and error translation.

Routes call only `IdentityApi`.

### Use Cases

Own business orchestration.

Examples:

```text
InvitationSignUpUseCase
VerifyEmailUseCase
SignInUseCase
SignOutUseCase
```

### Known Invitations

Local Identity read model for Membership invitation facts.

Identity verifies invitation tokens locally without calling Membership synchronously.

### Reactions

Event-driven behaviors that consume Membership invitation lifecycle events through Folksdo Processing Reaction Runtime™.

### BetterAuth Adapter

Hides BetterAuth from use cases.

BetterAuth owns password hashing, provider auth records, provider sessions, and verification token mechanics.

### Runtime

Composes Identity API, use cases, read stores, BetterAuth adapter, known-invitation verifier, and reactions.

---

# Invitation SignUp™ Component Flow

## 1. apps/server receives HTTP request

* host does not inspect business data
* host only routes request to Identity route
* host owns process lifecycle only

```text
HTTP Request
    ↓
apps/server
```

---

## 2. Identity route adapter runs

* parses body
* validates transport DTO
* resolves RuntimeContext
* calls IdentityApi only

```text
apps/server
    ↓
Identity Route Adapter
```

---

## 3. IdentityApi.invitationSignUp(...) runs

* receives validated input
* receives RuntimeContext
* delegates to InvitationSignUpUseCase

```text
Identity Route Adapter
    ↓
IdentityApi.invitationSignUp(...)
```

---

## 4. InvitationSignUpUseCase validates invitation

* calls LocalInvitationVerifier.verify(invitationToken)
* verifier reads Identity’s local known-invitation read model
* receives invitationId, targetTenantId, invitedEmail
* enforces request.email === invitedEmail
* rejects expired, revoked, redeemed, or missing invitations

```text
InvitationSignUpUseCase
    ↓
LocalInvitationVerifier
    ↓
identity_known_invitations
```

Identity does **not** call Membership synchronously.

---

## 5. Use case checks existing identity

* calls IdentityReadStore.findUserByEmail(email)
* decides create new identity or reuse existing identity
* email remains globally unique for Identity

```text
InvitationSignUpUseCase
    ↓
IdentityReadStore
```

---

## 6. Use case calls BetterAuthIdentityAdapter

* creates/reuses BetterAuth auth user
* creates password credential if needed
* creates provider session
* triggers BetterAuth email verification

```text
InvitationSignUpUseCase
    ↓
BetterAuthIdentityAdapter
    ↓
BetterAuth
```

---

## 7. Use case builds commit plan

### stateChanges

```text
User
UserProfile
Credential
Session
EmailVerification
```

### events

```text
UserCreated
UserProfileCreated
CredentialAdded
SessionCreated
EmailVerificationRequested
InvitationRedemptionRequested
```

### outbox

```text
identity.email_verification.requested
identity.invitation_redemption.requested
```

---

## 8. Use case calls Folksdo Engine

* calls engine.state.commit(...)
* Engine atomically persists state, events, outbox, and aggregate version

```text
InvitationSignUpUseCase
    ↓
Folksdo Engine Runtime
```

---

## 9. IdentityApi returns result

```text
userId
sessionId
status: pending_email_verification
emailVerificationRequired: true
```

---

## 10. Route adapter returns HTTP 201

```http
201 Created
```

---

# Sign In™ Component Flow

## 1. apps/server receives HTTP request

* host does not inspect credentials
* host only routes request to Identity route
* host owns process lifecycle only

```text
HTTP Request
    ↓
apps/server
```

---

## 2. Identity route adapter runs

* parses body
* validates transport DTO
* rejects malformed requests with HTTP 400
* calls IdentityApi only

```text
apps/server
    ↓
Identity Sign In Route Adapter
```

---

## 3. IdentityApi.signIn(...) runs

* receives validated input
* delegates to SignInUseCase
* keeps route decoupled from use case internals

```text
Identity Route Adapter
    ↓
IdentityApi.signIn(...)
```

---

## 4. SignInUseCase delegates to BetterAuth

* BetterAuth owns credential validation
* Identity does not check passwords directly
* provider secrets are not exposed to events, outbox, or HTTP response

```text
SignInUseCase
    ↓
BetterAuthIdentityAdapter.signIn(...)
    ↓
BetterAuth
```

---

## 5. Use case resolves identity eligibility

* calls IdentityReadStore
* confirms known user
* confirms active lifecycle state
* confirms verified email where required
* rejects suspended, archived, inactive, or unverified users

```text
SignInUseCase
    ↓
IdentityReadStore
```

---

## 6. Use case builds commit plan

### stateChanges

```text
Session
```

### events

```text
identity.session_created
```

### outbox

```text
identity.session_created
```

---

## 7. Use case calls Folksdo Engine

* calls engine.state.commit(...)
* Engine atomically persists session state, replayable event, outbox message, and aggregate version

```text
SignInUseCase
    ↓
Folksdo Engine Runtime
```

---

## 8. IdentityApi returns result

```text
userId
email
sessionId
expiresAt
```

---

## 9. Route adapter returns HTTP 200

```http
200 OK
```

---

# Sign In™ Production Constraints

Sign In™ must not:

* import NATS or JetStream
* call downstream services synchronously
* expose BetterAuth internals to routes
* persist secrets in events or outbox
* bypass IdentityApi
* perform business orchestration inside HTTP routes

---

# Known Invitation Reaction Flow

Membership owns invitation issuance.

Identity receives invitation facts asynchronously.

```text
Membership Service
    ↓ emits membership.invitation.created
Folksdo Processing Reaction Runtime™
    ↓
Identity reaction handler
    ↓
identity_known_invitations updated
```

When Membership emits:

```text
membership.invitation.created
```

Identity records:

```text
invitationId
targetTenantId
invitedEmail
invitationTokenHash
status
expiresAt
createdAt
updatedAt
```

When Membership emits:

```text
membership.invitation.expired
membership.invitation.revoked
membership.invitation.redeemed
```

Identity updates the known invitation status locally.

---

# Service Independence Rule

Identity must not synchronously call Membership during signup.

Instead:

```text
Membership emits invitation lifecycle events.
Identity reacts and stores local invitation facts.
Identity verifies signup locally.
Identity emits InvitationRedemptionRequested.
Membership reacts later.
```

---

# Production Validation

Identity Service currently has:

```text
Integration tests
E2E tests
Bruno production validation
```

Validation covers:

```text
malformed request
invalid invitation token
email mismatch
valid invitation signup
verify-email rejection
sign-in happy path
sign-out happy path
known invitation reactions
```

---

# Final Status

```text
Identity Service completed use cases
Status: production-grade complete for Invitation SignUp™, Verify Email™, Sign In™, and Sign Out™.
```

Membership still owns:

```text
invitation issuance
role decisioning
membership creation
membership activation
redemption completion
```

---

# Use Case 5 — Current Session™ Architectural Flow

```text
HTTP Route
    ↓
IdentityApi.getCurrentSession(...)
    ↓
GetCurrentSessionUseCase
    ↓
IdentityReadStore.findSessionById(...)
    ↓
Safe session response
```

Route owns HTTP boundary.

IdentityApi owns service API boundary.

GetCurrentSessionUseCase owns session read orchestration.

No state commit, event, or outbox message is required.

---

# Use Case 6 — Current User™ Architectural Flow

```text
HTTP Route
    ↓
IdentityApi.getCurrentUser(...)
    ↓
GetCurrentUserUseCase
    ↓
IdentityReadStore.findSessionById(...)
    ↓
IdentityReadStore.findUserById(...)
    ↓
Safe user response
```

Route owns HTTP boundary.

IdentityApi owns service API boundary.

GetCurrentUserUseCase owns session and user read orchestration.

Memberships, roles, permissions, tenant access, credentials, and provider internals are excluded.

No state commit, event, or outbox message is required.
