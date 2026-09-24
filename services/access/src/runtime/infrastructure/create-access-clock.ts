// services/access/src/runtime/infrastructure/create-access-clock.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS CLOCK
// -----------------------------------------------------------------------------
// Default runtime clock for Access Operations™.
//
// Purpose:
//   • implement the canonical AccessClock application contract
//   • centralize current-time acquisition
//   • allow deterministic clock replacement in tests
//   • prevent direct Date construction throughout application composition
//
// Boundary:
//   • provides time only
//   • contains no scheduling behavior
//   • contains no expiration decisions
//   • contains no business lifecycle behavior
// -----------------------------------------------------------------------------

import type {
    AccessClock,
} from "../../usecases";

// -----------------------------------------------------------------------------
// TIME PROVIDER
// -----------------------------------------------------------------------------

export interface AccessTimeProvider {
    now(): Date;
}

// -----------------------------------------------------------------------------
// FACTORY OPTIONS
// -----------------------------------------------------------------------------

export interface CreateAccessClockOptions {
    /**
     * Optional lower-level time provider.
     *
     * Tests may inject a deterministic implementation while production uses
     * the system clock.
     */
    readonly timeProvider?:
    AccessTimeProvider;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessClock(
    options: CreateAccessClockOptions = {},
): AccessClock {
    const timeProvider =
        options.timeProvider
        ?? createSystemAccessTimeProvider();

    return {
        now: () => {
            const current =
                timeProvider.now();

            assertValidDate(current);

            return current.toISOString();
        },
    };
}

// -----------------------------------------------------------------------------
// SYSTEM PROVIDER
// -----------------------------------------------------------------------------

export function createSystemAccessTimeProvider():
    AccessTimeProvider {
    return {
        now:
            () =>
                new Date(),
    };
}

// -----------------------------------------------------------------------------
// FIXED PROVIDER
// -----------------------------------------------------------------------------

/**
 * Creates a deterministic provider useful for integration and unit tests.
 *
 * A fresh Date instance is returned on every call to prevent shared mutation.
 */
export function createFixedAccessTimeProvider(
    value: Date | string,
): AccessTimeProvider {
    const fixed =
        typeof value === "string"
            ? new Date(value)
            : new Date(value.getTime());

    assertValidDate(fixed);

    return {
        now: () =>
            new Date(fixed.getTime()),
    };
}
// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

function assertValidDate(
    value: unknown,
): asserts value is Date {
    if (
        !(value instanceof Date)
        || Number.isNaN(
            value.getTime(),
        )
    ) {
        throw new TypeError(
            "Access time provider must return a valid Date.",
        );
    }
}