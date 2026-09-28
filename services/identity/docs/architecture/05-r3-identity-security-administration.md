# R3 — Identity Security Administration™

## Purpose

R3 gives Provider Admin operators production-grade Identity security administration without database access, credential exposure, or bypassing Identity → Membership → Access authority boundaries.

## Certified administration surfaces

### Session administration

Provider-authorized operations support active-session discovery, safe session detail, individual revocation, and revoke-all. Public responses never expose session tokens, provider session identifiers, credential secrets, or password material.

### Provider recovery initiation

Provider Admin may initiate the existing Identity password-recovery lifecycle. The provider initiates recovery only; it cannot directly set or reset a user's credential.

### Identity suspension and reactivation

Suspension is Identity-owned canonical lifecycle state. Suspending an Identity revokes active sessions and makes the Identity ineligible to authenticate. Existing Identity lifecycle reactions remove usable downstream IAM authority through the Membership/Access chain.

Reactivation restores Identity eligibility only. It does not recreate revoked sessions or manufacture Membership or Access state. A fresh authentication is required.

### Security Summary

The provider security summary exposes safe operational facts including Identity status, verification state, credential-active/sign-in eligibility indicators, recovery state, session counts/lifecycle summary, and security indicators. It exposes no credential or session secrets.

### Authentication investigation

Provider Admin can read safe Identity-owned security history derived from canonical Identity events. This includes session lifecycle, verification, recovery/password lifecycle, suspension/reactivation, and safe request/correlation/actor/tenant metadata.

This is not a new audit subsystem. Cross-service operational audit and investigation remains the responsibility of Platform Audit™.

## Provider permissions

R3 uses explicit Provider Admin permissions for session listing/detail/revocation, recovery initiation, Identity suspension/reactivation, Security Summary, and security-history reads. Tenant authority never implies Provider authority.

## Release gate

R3 is certified through a real incident journey using IAM HTTP, Engine, MongoDB, NATS/outbox processing, and real authorization:

1. identify the target Identity;
2. inspect Security Summary and security history;
3. inspect and revoke sessions;
4. initiate recovery;
5. suspend the Identity;
6. prove authentication is blocked and existing IAM authority is unusable;
7. reactivate the Identity;
8. prove eligibility is restored without recreating downstream authority or sessions.

The release gate also verifies provider authorization, secret-safe responses, lifecycle correctness, and compatibility with the existing R1/R2 administration surfaces.

## Certification status

R3 local certification: **GREEN**.
