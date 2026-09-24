// services/identity/src/business-rules/create-email-verification.ts
// -----------------------------------------------------------------------------
// CREATE EMAIL VERIFICATION BUSINESS RULE
// -----------------------------------------------------------------------------

import { InvalidSignupStateError } from "../errors";
import type { IdentityEmailVerificationState } from "../state";

export interface CreateEmailVerificationInput {
    readonly verificationId: string;
    readonly userId: string;
    readonly email: string;
    readonly provider: string;
    readonly providerVerificationId?: string;
    readonly requestedAt: string;
    readonly expiresAt: string;
}

export function createEmailVerification(
    input: CreateEmailVerificationInput,
): IdentityEmailVerificationState {
    if (input.expiresAt <= input.requestedAt) {
        throw new InvalidSignupStateError(
            "Verification expiration must be after request time.",
        );
    }

    return {
        verificationId: input.verificationId,
        userId: input.userId,
        email: input.email,
        provider: input.provider,
        providerVerificationId: input.providerVerificationId,
        status: "pending",
        requestedAt: input.requestedAt,
        expiresAt: input.expiresAt,
    };
}
