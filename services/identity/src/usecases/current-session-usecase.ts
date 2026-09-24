// services/identity/src/usecases/current-session-usecase.ts
// -----------------------------------------------------------------------------
// CURRENT SESSION USE CASE
// -----------------------------------------------------------------------------
// Production read-side orchestration for Current Session™.
//
// Purpose:
//   • validate a safe Identity-owned session reference
//   • resolve current authenticated session state
//   • reject inactive, signed-out, revoked, or expired sessions
//   • reject sessions owned by an ineligible Identity
//   • return a public session response with no provider internals or secrets
//
// Security boundary:
//
// A structurally active session is not sufficient authentication evidence.
//
// Current Session™ must validate:
//
//   Session exists
//          ↓
//   Session is active
//          ↓
//   Session is not expired
//          ↓
//   Owning Identity exists
//          ↓
//   Owning Identity is active and verified
//          ↓
//   Return public session state
//
// This use case is intentionally read-only.
// It does not emit events and does not write outbox messages.
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    CurrentSessionRequest,
    CurrentSessionResult,
} from "../api";

import {
    AuthenticationSessionRequiredError,
    CurrentSessionExpiredError,
    CurrentSessionNotActiveError,
    CurrentSessionNotFoundError,
} from "../errors";

import type {
    IdentityReadStore,
} from "../read-store";

import type {
    IdentitySessionState,
    IdentityUserState,
} from "../state";

// -----------------------------------------------------------------------------
// USE CASE CONTRACT
// -----------------------------------------------------------------------------

export interface CurrentSessionUseCase {
    execute(
        input:
            CurrentSessionRequest,

        context:
            RuntimeContext,
    ): Promise<CurrentSessionResult>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CurrentSessionUseCaseDependencies {
    readonly clock:
    Clock;

    readonly readStore:
    IdentityReadStore;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createCurrentSessionUseCase(
    dependencies:
        CurrentSessionUseCaseDependencies,
): CurrentSessionUseCase {
    return {
        async execute(
            input:
                CurrentSessionRequest,

            _context:
                RuntimeContext,
        ): Promise<CurrentSessionResult> {
            const sessionId =
                normalizeSessionId(
                    input.sessionId,
                );

            const session =
                await dependencies
                    .readStore
                    .findSessionById(
                        sessionId,
                    );

            if (
                !session
            ) {
                throw new CurrentSessionNotFoundError();
            }

            assertCurrentSessionEligible({
                session,

                now:
                    dependencies
                        .clock
                        .nowTimestamp(),
            });

            const user =
                await dependencies
                    .readStore
                    .findUserById(
                        session.userId,
                    );

            if (
                !user
            ) {
                throw new CurrentSessionNotActiveError();
            }

            assertCurrentSessionIdentityEligible({
                user,
            });

            return toCurrentSessionResult(
                session,
            );
        },
    };
}

// -----------------------------------------------------------------------------
// SESSION REFERENCE
// -----------------------------------------------------------------------------

export function normalizeSessionId(
    sessionId:
        string,
): string {
    const normalized =
        sessionId.trim();

    if (
        !normalized
    ) {
        throw new AuthenticationSessionRequiredError();
    }

    return normalized;
}

// -----------------------------------------------------------------------------
// SESSION ELIGIBILITY
// -----------------------------------------------------------------------------

export function assertCurrentSessionEligible(
    input: {
        readonly session:
        IdentitySessionState;

        readonly now:
        string;
    },
): void {
    if (
        input.session.status !==
        "active"
    ) {
        throw new CurrentSessionNotActiveError();
    }

    if (
        input.session.expiresAt <=
        input.now
    ) {
        throw new CurrentSessionExpiredError();
    }
}

// -----------------------------------------------------------------------------
// IDENTITY ELIGIBILITY
// -----------------------------------------------------------------------------

export function assertCurrentSessionIdentityEligible(
    input: {
        readonly user:
        IdentityUserState;
    },
): void {
    if (
        input.user.status !==
        "active"
    ) {
        throw new CurrentSessionNotActiveError();
    }

    if (
        !input.user.emailVerified
    ) {
        throw new CurrentSessionNotActiveError();
    }
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

function toCurrentSessionResult(
    session:
        IdentitySessionState,
): CurrentSessionResult {
    return {
        sessionId:
            session.sessionId,

        userId:
            session.userId,

        status:
            "active",

        createdAt:
            session.createdAt,

        expiresAt:
            session.expiresAt,
    };
}