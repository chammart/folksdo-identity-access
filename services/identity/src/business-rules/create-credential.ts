// services/identity/src/business-rules/create-credential.ts
// -----------------------------------------------------------------------------
// CREATE CREDENTIAL BUSINESS RULE
// -----------------------------------------------------------------------------

import { InvalidSignupStateError } from "../errors";
import type { IdentityCredentialState } from "../state";

export interface CreateCredentialInput {
    readonly credentialId: string;
    readonly userId: string;
    readonly provider: string;
    readonly providerCredentialId: string;
    readonly now: string;
}

export function createCredential(
    input: CreateCredentialInput,
): IdentityCredentialState {
    if (!input.providerCredentialId.trim()) {
        throw new InvalidSignupStateError(
            "Provider credential reference is required.",
        );
    }

    return {
        credentialId: input.credentialId,
        userId: input.userId,
        type: "password",
        provider: input.provider,
        providerCredentialId: input.providerCredentialId,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
    };
}
