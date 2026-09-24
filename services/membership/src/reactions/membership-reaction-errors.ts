// services/membership/src/reactions/membership-reaction-errors.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP REACTION ERRORS
// -----------------------------------------------------------------------------
// Stable failure classification consumed by operational retry/DLQ policies.
// -----------------------------------------------------------------------------

export type MembershipReactionFailureClassification =
    | "permanent"
    | "transient";

export class MembershipReactionError extends Error {
    public constructor(
        public readonly code: string,
        public readonly classification: MembershipReactionFailureClassification,
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = new.target.name;
    }

    public get retryable(): boolean {
        return this.classification === "transient";
    }
}

export class MembershipReactionPayloadError extends MembershipReactionError {
    public constructor(message: string) {
        super(
            "membership_reaction_invalid_payload",
            "permanent",
            message,
        );
    }
}

export class MembershipReactionPermanentBusinessError
    extends MembershipReactionError {
    public constructor(
        code: string,
        message: string,
        cause?: unknown,
    ) {
        super(
            code,
            "permanent",
            message,
            cause,
        );
    }
}

export function isPermanentMembershipReactionFailure(
    error: unknown,
): boolean {
    return error instanceof MembershipReactionError
        && error.classification === "permanent";
}
