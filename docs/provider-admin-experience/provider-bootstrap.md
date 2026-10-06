# Provider Admin Experience™ — Provider Bootstrap

## Purpose

Provider bootstrap establishes the initial Provider operator required to begin administering Saiwaly IAM™.

It is a deployment/bootstrap capability, not the normal lifecycle for onboarding future Provider administrators.

## Single bootstrap mechanism

Local, staging, and future production use the same command:

```text
pnpm iam:bootstrap-provider
```

Environment-specific values change; the IAM provisioning mechanism does not.

## IAM lifecycle

Bootstrap respects the normal IAM capability boundaries:

```text
Provider identity
      ↓
Provider membership
      ↓
Membership activation
      ↓
Provider access
```

Identity invitation/sign-up, Membership lifecycle, and Access mutations remain service-owned. Bootstrap does not directly write IAM domain state to MongoDB.

## Idempotency

Bootstrap is designed to be rerunnable. It reconciles an existing Provider identity/membership/access state and treats already-established canonical grants as satisfied rather than attempting duplicate access mutations.

The local release gate executes bootstrap twice specifically to certify this behavior.

## Credentials and secrets

Bootstrap requires Provider email, password, and Provider tenant identifier. In non-local environments these values come from the deployment/operator secret store.

The Provider password must not be committed to the repository, persisted into the runtime `.env`, printed in logs, or included in certification artifacts.

Successful output may identify the environment, Provider email, tenant, and that a credential was configured; it must not display the secret itself.

## Security boundary

There is no public unauthenticated Provider-bootstrap HTTP endpoint. Bootstrap runs as trusted deployment tooling and delegates domain mutations to IAM capabilities.

After the initial Provider operator exists, ordinary Provider administration remains subject to IAM authentication and Provider authorization.

## Additional Provider operators

The certified R8 baseline does not yet provide the complete Provider Admin → invite another Provider operator → grant Provider administrative authorization lifecycle.

That will be implemented separately on top of R8. The bootstrap command should not become a substitute for that administrative lifecycle.
