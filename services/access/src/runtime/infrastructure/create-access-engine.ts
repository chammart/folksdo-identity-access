// services/access/src/runtime/infrastructure/create-access-engine.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS ENGINE
// -----------------------------------------------------------------------------
// Runtime infrastructure factory for the Folksdo Engine dependency used by
// Access Operations™.
//
// Purpose:
//   • validate the engine supplied by the platform composition root
//   • expose the engine through the Access-owned application contract
//   • prevent provider construction from leaking into Access use cases
//   • preserve shared infrastructure ownership
//
// Boundary:
//   • does not create the platform-wide Folksdo Engine instance
//   • does not open database or messaging connections
//   • does not start processing workers
//   • does not contain business behavior
//
// Ownership:
//   The application server owns the Folksdo Engine lifecycle. Access receives
//   the already-created public engine client and must never close it.
// -----------------------------------------------------------------------------

import type {
    FolksdoEngine,
} from "../../usecases";

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessEngineInput {
    /**
     * Shared Folksdo Engine public client.
     *
     * The concrete engine instance is created by the platform composition root
     * and injected into Access Operations™.
     */
    readonly engine:
    FolksdoEngine;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessEngine(
    input:
        CreateAccessEngineInput,
): FolksdoEngine {
    assertAccessEngine(
        input.engine,
    );

    return input.engine;
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

export function assertAccessEngine(
    engine: unknown,
): asserts engine is FolksdoEngine {
    if (
        typeof engine !== "object"
        || engine === null
    ) {
        throw new TypeError(
            "Access runtime requires a Folksdo Engine client.",
        );
    }

    const candidate =
        engine as Partial<FolksdoEngine>;

    if (
        typeof candidate.commit !== "function"
    ) {
        throw new TypeError(
            "Access runtime requires an engine with a commit function.",
        );
    }
}

// -----------------------------------------------------------------------------
// TYPE GUARD
// -----------------------------------------------------------------------------

export function isAccessEngine(
    value: unknown,
): value is FolksdoEngine {
    try {
        assertAccessEngine(
            value,
        );

        return true;
    } catch {
        return false;
    }
}