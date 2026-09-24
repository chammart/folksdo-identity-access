// services/identity/src/state/user-profile.ts
// -----------------------------------------------------------------------------
// IDENTITY USER PROFILE STATE
// -----------------------------------------------------------------------------
// Canonical global profile state owned by Identity Service™.
// -----------------------------------------------------------------------------

export interface IdentityUserProfileState {
    readonly profileId: string;
    readonly userId: string;
    readonly displayName?: string;
    readonly locale?: string;
    readonly timezone?: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
