// services/access/src/runtime/access-service-config.ts
// -----------------------------------------------------------------------------
// ACCESS SERVICE CONFIG
// -----------------------------------------------------------------------------
// Production configuration for Access Operations™ service composition.
//
// Purpose:
//   • expose Access service enablement
//   • expose lifecycle worker scheduling configuration
//   • keep environment parsing outside the Access package
//
// Boundary:
//   • contains configuration contracts only
//   • does not read environment variables
//   • does not construct runtime infrastructure
// -----------------------------------------------------------------------------

import type {
    AccessRuntimeConfigInput,
} from "./access-runtime-config";

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessServiceConfig
extends AccessRuntimeConfigInput {
    readonly enabled?:
    boolean;
}
