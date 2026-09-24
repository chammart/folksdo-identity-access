// services/identity/src/business-rules/create-user-profile.ts
// -----------------------------------------------------------------------------
// CREATE USER PROFILE BUSINESS RULE
// -----------------------------------------------------------------------------

import type { IdentityUserProfileState } from "../state";

export interface CreateUserProfileInput {
    readonly profileId: string;
    readonly userId: string;
    readonly displayName?: string;
    readonly locale?: string;
    readonly timezone?: string;
    readonly now: string;
}

export function createUserProfile(
    input: CreateUserProfileInput,
): IdentityUserProfileState {
    return {
        profileId: input.profileId,
        userId: input.userId,
        displayName: normalizeOptional(input.displayName),
        locale: normalizeOptional(input.locale),
        timezone: normalizeOptional(input.timezone),
        createdAt: input.now,
        updatedAt: input.now,
    };
}

function normalizeOptional(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}
