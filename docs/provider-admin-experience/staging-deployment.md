# Provider Admin Experience™ — Staging Deployment

## Purpose

The staging deployment promotes the certified R8 implementation and establishes the staging Provider operator without storing bootstrap credentials on the host.

## Deployment sequence

The staging workflow follows this order:

```text
Certify / build / publish
          ↓
        Deploy
          ↓
Bootstrap Provider operator
          ↓
Staging preparation / certification
```

Provider bootstrap therefore runs against the deployed IAM version before staging acceptance is completed.

## GitHub Environment secrets

The `staging` GitHub Environment supplies these values to the bootstrap job:

```text
IAM_PROVIDER_BOOTSTRAP_EMAIL
IAM_PROVIDER_BOOTSTRAP_PASSWORD
IAM_PROVIDER_BOOTSTRAP_TENANT_ID
```

The workflow validates that the required values are present and injects them only for the Provider-bootstrap execution.

They are deployment inputs, not persistent application configuration, and must not be written into the staging runtime `.env`.

## Bootstrap execution

The deployment executes the same canonical command used locally:

```text
pnpm iam:bootstrap-provider
```

This keeps Provider provisioning behavior consistent across environments while allowing each environment to own independent credentials.

## Staging security rules

- Staging credentials must be independent from local and production credentials.
- The Provider password must remain in the GitHub Environment secret store.
- Deployment/bootstrap logs must never print the password.
- The deployed IAM APIs remain the authority for Provider authentication and authorization.
- Bootstrap must remain safe to rerun during a repeated deployment.

## Certification

A successful staging release requires deployment and staging certification to remain green after Provider bootstrap.

The current R8 staging workflow includes Provider bootstrap. Production promotion must receive equivalent explicit secret injection and bootstrap wiring before R8 is promoted to production; staging wiring alone must not be assumed to configure production.
