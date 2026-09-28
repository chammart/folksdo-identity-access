export const identityPermissions = {
    list: "identity.identity.list",
    view: "identity.identity.view",
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

export type IdentityPermission =
    (typeof identityPermissions)[keyof typeof identityPermissions];
