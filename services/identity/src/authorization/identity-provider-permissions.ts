// services/identity/src/authorization/identity-provider-permissions.ts
// -----------------------------------------------------------------------------
// IDENTITY PROVIDER PERMISSIONS
// -----------------------------------------------------------------------------
// Identity owns which provider operations require authorization. Access owns
// the canonical catalog and final decision.
// -----------------------------------------------------------------------------
export const identityProviderPermissions = {
    view: "identity.identity.view",
    list: "identity.identity.list",
} as const;
export type IdentityProviderPermission = (typeof identityProviderPermissions)[keyof typeof identityProviderPermissions];
