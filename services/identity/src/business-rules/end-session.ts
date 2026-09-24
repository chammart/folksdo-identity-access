// services/identity/src/business-rules/end-session.ts
// -----------------------------------------------------------------------------
// END SESSION BUSINESS RULE
// -----------------------------------------------------------------------------
// Ends an active Identity-owned session.
// -----------------------------------------------------------------------------

import { SessionNotActiveError } from "../errors";
import type { IdentitySessionState } from "../state";

export interface EndSessionInput {
    readonly session: IdentitySessionState;
    readonly endedAt: string;
}

export function endSession(input: EndSessionInput): IdentitySessionState {
    if (input.session.status !== "active") {
        throw new SessionNotActiveError();
    }

    return {
        ...input.session,
        status: "signed_out",
        endedAt: input.endedAt,
        updatedAt: input.endedAt,
    };
}
