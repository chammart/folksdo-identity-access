// scripts/development/prepare-local-provider.ts
// -----------------------------------------------------------------------------
// PREPARE LOCAL PROVIDER
// -----------------------------------------------------------------------------
// Local convenience alias for the canonical Provider bootstrap mechanism.
// -----------------------------------------------------------------------------

process.env.IAM_PROVIDER_BOOTSTRAP_ENVIRONMENT ??= "local";

await import("../bootstrap/bootstrap-provider");

export {};
