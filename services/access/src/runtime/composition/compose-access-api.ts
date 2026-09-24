// services/access/src/runtime/composition/compose-access-api.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS API
// -----------------------------------------------------------------------------
// Runtime composition for the provider-neutral Access API façade.
//
// Purpose:
//   • compose the complete Access API from verified operation handlers
//   • keep route registration independent from application adaptation
//   • preserve the canonical AccessApi contract
//
// Boundary:
//   • does not guess DTO-to-use-case translations
//   • does not fabricate missing assignment query use cases
//   • does not perform HTTP registration
//   • contains no authentication behavior
// -----------------------------------------------------------------------------

import {
    createAccessApi,
    type AccessApi,
    type CreateAccessApiDependencies,
} from "../../api";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessApiInput {
    readonly operations:
    CreateAccessApiDependencies;
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessApi(
    input:
    ComposeAccessApiInput,
): AccessApi {
    return createAccessApi(
        input.operations,
    );
}
