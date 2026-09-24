// services/identity/src/business-rules/create-user.ts
// -----------------------------------------------------------------------------
// CREATE USER BUSINESS RULE
// -----------------------------------------------------------------------------

import { InvalidSignupStateError } from "../errors";
import type { IdentityUserState } from "../state";

export interface CreateUserInput {
    readonly userId: string;
    readonly email: string;
    readonly now: string;
}

export function createUser(input: CreateUserInput): IdentityUserState {
    const email = normalizeEmail(input.email);

    return {
        userId: input.userId,
        email,
        status: "pending_email_verification",
        emailVerified: false,
        createdAt: input.now,
        updatedAt: input.now,
    };
}

export function normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
        throw new InvalidSignupStateError("Email is required.");
    }

    return normalized;
}
