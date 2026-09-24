// services/identity/src/authorization/identity-permissions.ts
export const identityPermissions = {
    list: "identity.identity.list",
    view: "identity.identity.view",
} as const;

export type IdentityPermission =
    (typeof identityPermissions)[keyof typeof identityPermissions];
