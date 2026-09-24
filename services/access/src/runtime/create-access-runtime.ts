// services/access/src/runtime/create-access-runtime.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS RUNTIME
// -----------------------------------------------------------------------------
// Final runtime factory for Access Operations™.
//
// Purpose:
//   • resolve and validate Access runtime configuration
//   • validate the minimum composed runtime capabilities
//   • create the default lifecycle-aware Access runtime
//
// Boundary:
//   • does not compose lower-level Access capabilities
//   • does not start the runtime automatically
//   • contains no business or transport behavior
// -----------------------------------------------------------------------------

import {
    resolveAccessRuntimeConfig,
} from "./access-runtime-config";

import type {
    AccessRuntime,
    CreateAccessRuntimeInput,
} from "./access-runtime-contracts";

import {
    DefaultAccessRuntime,
} from "./access-runtime";

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessRuntime(
    input:
    CreateAccessRuntimeInput,
): AccessRuntime {
    validateRequiredComponents(
        input,
    );

    return new DefaultAccessRuntime({
        config:
            resolveAccessRuntimeConfig(
                input.config,
            ),

        components:
            input.components,

        lifecycle:
            input.lifecycle
            ?? {},
    });
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

function validateRequiredComponents(
    input:
    CreateAccessRuntimeInput,
): void {
    if (
        input.components.api === undefined
    ) {
        throw new Error(
            "Access runtime requires a composed API.",
        );
    }

    if (
        input.components.reactions === undefined
    ) {
        throw new Error(
            "Access runtime requires a composed reaction dispatcher.",
        );
    }
}
