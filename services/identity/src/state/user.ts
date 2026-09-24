// services/identity/src/state/user.ts
// -----------------------------------------------------------------------------
// IDENTITY USER STATE
// -----------------------------------------------------------------------------
// Canonical global user state owned by Identity Service™.
// -----------------------------------------------------------------------------

export type IdentityUserStatus =
    | "pending_email_verification"
    | "active"
    | "suspended"
    | "disabled";

export interface IdentityUserState {
    readonly userId: string;
    readonly email: string;
    readonly status: IdentityUserStatus;
    readonly emailVerified: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly activatedAt?: string;
}
