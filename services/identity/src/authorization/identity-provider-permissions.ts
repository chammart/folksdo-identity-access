// services/identity/src/authorization/identity-provider-permissions.ts
// -----------------------------------------------------------------------------
// IDENTITY PROVIDER PERMISSIONS
// -----------------------------------------------------------------------------
export const identityProviderPermissions = {
    view: "identity.identity.view",
    list: "identity.identity.list",
    sessionList: "identity.session.list",
    sessionView: "identity.session.view",
    sessionRevoke: "identity.session.revoke",
    sessionRevokeAll: "identity.session.revoke-all",
    recoveryInitiate: "identity.recovery.initiate",
    suspend: "identity.identity.suspend",
    reactivate: "identity.identity.reactivate",
    securitySummaryView: "identity.identity.security-summary-view",
    securityHistoryView: "identity.identity.security-history-view",
} as const;
export type IdentityProviderPermission = (typeof identityProviderPermissions)[keyof typeof identityProviderPermissions];
