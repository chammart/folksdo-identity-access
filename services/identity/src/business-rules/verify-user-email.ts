// services/identity/src/business-rules/verify-user-email.ts
// -----------------------------------------------------------------------------
// VERIFY USER EMAIL BUSINESS RULE
// -----------------------------------------------------------------------------

import { UserAlreadyVerifiedError } from "../errors";
import type { IdentityUserState } from "../state";

export interface VerifyUserEmailInput {
    readonly user: IdentityUserState;
    readonly verifiedAt: string;
}

export function verifyUserEmail(input: VerifyUserEmailInput): IdentityUserState {
    if (input.user.emailVerified) {
        throw new UserAlreadyVerifiedError();
    }

    return {
        ...input.user,
        status: "active",
        emailVerified: true,
        updatedAt: input.verifiedAt,
        activatedAt: input.verifiedAt,
    };
}
