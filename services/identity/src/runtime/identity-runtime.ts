// services/identity/src/runtime/identity-runtime.ts
// -----------------------------------------------------------------------------
// IDENTITY RUNTIME CONTRACT
// -----------------------------------------------------------------------------
// Runtime boundary exposed by Identity Service™.
//
// Purpose:
//   • expose Identity public API
//   • expose Identity reaction dispatcher
//   • keep service-owned runtime capabilities grouped together
//
// Host owns process lifecycle only.
// Identity owns API and reaction behavior.
// -----------------------------------------------------------------------------

import type { IdentityApi } from "../api";
import type { IdentityReactionDispatcher } from "../reactions";

export interface IdentityRuntime {
    readonly api: IdentityApi;

    readonly reactions: IdentityReactionDispatcher;
}
