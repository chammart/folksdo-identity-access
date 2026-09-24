// services/identity/src/usecases/current-user-usecase.ts
// -----------------------------------------------------------------------------
// CURRENT USER USE CASE
// -----------------------------------------------------------------------------
// Production read-side orchestration for Current User™.
//
// Purpose:
//   • validate a safe Identity-owned session reference
//   • resolve the active session
//   • resolve the associated user Identity
//   • enforce session and owning Identity eligibility
//   • return safe user Identity state only
//
// Security boundary:
//
//   Session exists
//          ↓
//   Session is active and unexpired
//          ↓
//   Owning Identity exists
//          ↓
//   Owning Identity is active and verified
//          ↓
//   Return public Identity state
//
// A disabled, archived, or unverified Identity does not retain a valid
// authenticated execution context.
//
// This use case intentionally excludes Memberships, Roles, Permissions, Tenant
// access decisions, credentials, provider secrets, and BetterAuth internals.
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    CurrentUserRequest,
    CurrentUserResult,
} from "../api";

import {
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

import {
    assertCurrentSessionEligible,
    assertCurrentSessionIdentityEligible,
    normalizeSessionId,
} from "./current-session-usecase";

// -----------------------------------------------------------------------------
// USE CASE CONTRACT
// -----------------------------------------------------------------------------

export interface CurrentUserUseCase {
    execute(
        input:
            CurrentUserRequest,

        context:
            RuntimeContext,
    ): Promise<CurrentUserResult>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CurrentUserUseCaseDependencies {
    readonly clock:
    Clock;

    readonly readStore:
    IdentityReadStore;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createCurrentUserUseCase(
    dependencies:
        CurrentUserUseCaseDependencies,
): CurrentUserUseCase {
    return {
        async execute(
            input:
                CurrentUserRequest,

            _context:
                RuntimeContext,
        ): Promise<CurrentUserResult> {
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
                await resolveCurrentUser({
                    readStore:
                        dependencies.readStore,

                    session,
                });

            assertCurrentSessionIdentityEligible({
                user,
            });

            return toCurrentUserResult(
                user,
            );
        },
    };
}

// -----------------------------------------------------------------------------
// USER RESOLUTION
// -----------------------------------------------------------------------------

async function resolveCurrentUser(
    input: {
        readonly readStore:
        IdentityReadStore;

        readonly session:
        IdentitySessionState;
    },
): Promise<IdentityUserState> {
    const user =
        await input
            .readStore
            .findUserById(
                input.session.userId,
            );

    if (
        !user
    ) {
        throw new CurrentSessionNotActiveError();
    }

    return user;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

function toCurrentUserResult(
    user:
        IdentityUserState,
): CurrentUserResult {
    return {
        userId:
            user.userId,

        email:
            user.email,

        status:
            user.status,

        emailVerified:
            user.emailVerified,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,
    };
}