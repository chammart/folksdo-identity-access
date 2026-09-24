// services/identity/src/business-rules/create-session.ts
// -----------------------------------------------------------------------------
// CREATE SESSION BUSINESS RULE
// -----------------------------------------------------------------------------

import { InvalidSignupStateError } from "../errors";
import type { IdentitySessionState } from "../state";

export interface CreateSessionInput {
    readonly sessionId: string;
    readonly userId: string;
    readonly provider: string;
    readonly providerSessionId: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
    readonly now: string;
}

export function createSession(input: CreateSessionInput): IdentitySessionState {
    if (input.expiresAt <= input.issuedAt) {
        throw new InvalidSignupStateError(
            "Session expiration must be after issue time.",
        );
    }

    return {
        sessionId: input.sessionId,
        userId: input.userId,
        provider: input.provider,
        providerSessionId: input.providerSessionId,
        status: "active",
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        createdAt: input.now,
        updatedAt: input.now,
    };
}
