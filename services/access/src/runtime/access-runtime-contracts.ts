// services/access/src/runtime/access-runtime-contracts.ts
// -----------------------------------------------------------------------------
// ACCESS RUNTIME CONTRACTS
// -----------------------------------------------------------------------------
// Public contracts used to construct and operate Access Operations™ runtime.
//
// Purpose:
//   • define the final runtime composition input
//   • expose verified composed Access capabilities
//   • define lifecycle, readiness and route-registration operations
//
// Boundary:
//   • contains contracts only
//   • does not construct dependencies
//   • does not implement runtime lifecycle behavior
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
} from "fastify";

import type {
    AccessApi,
} from "../api";

import type {
    ComposedAccessAdapters,
    ComposedAccessReadStore,
    ComposedAccessRoutes,
    ComposedAccessUseCases,
    ComposedAccessWorkers,
    AccessReactionDispatcher,
} from "./composition";

import type {
    AccessReadinessProbe,
    AccessReadinessResult,
    AccessRuntimeLifecycleClock,
    AccessRuntimeLifecycleLogger,
    AccessRuntimeLifecycleState,
    AccessRuntimeManagedResource,
    StartAccessRuntimeResult,
    StopAccessRuntimeResult,
} from "./lifecycle";

import type {
    AccessRuntimeConfig,
    AccessRuntimeConfigInput,
} from "./access-runtime-config";

// -----------------------------------------------------------------------------
// COMPOSED CAPABILITIES
// -----------------------------------------------------------------------------

export interface AccessRuntimeComponents {
    readonly api:
    AccessApi;

    readonly reactions:
    AccessReactionDispatcher;

    readonly routes?:
    ComposedAccessRoutes;

    readonly adapters?:
    ComposedAccessAdapters;

    readonly readStore?:
    ComposedAccessReadStore;

    readonly useCases?:
    ComposedAccessUseCases;

    readonly workers?:
    ComposedAccessWorkers;
}

// -----------------------------------------------------------------------------
// LIFECYCLE INPUT
// -----------------------------------------------------------------------------

export interface AccessRuntimeLifecycleInput {
    readonly resources?:
    readonly AccessRuntimeManagedResource[];

    readonly readinessProbes?:
    readonly AccessReadinessProbe[];

    readonly clock?:
    AccessRuntimeLifecycleClock;

    readonly logger?:
    AccessRuntimeLifecycleLogger;
}

// -----------------------------------------------------------------------------
// FACTORY INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessRuntimeInput {
    readonly components:
    AccessRuntimeComponents;

    readonly config?:
    AccessRuntimeConfigInput;

    readonly lifecycle?:
    AccessRuntimeLifecycleInput;
}

// -----------------------------------------------------------------------------
// RUNTIME CONTRACT
// -----------------------------------------------------------------------------

export interface AccessRuntime {
    readonly config:
    AccessRuntimeConfig;

    readonly components:
    AccessRuntimeComponents;

    readonly lifecycleState:
    AccessRuntimeLifecycleState | undefined;

    readonly started:
    boolean;

    start():
    Promise<StartAccessRuntimeResult>;

    stop():
    Promise<StopAccessRuntimeResult>;

    validateReadiness():
    Promise<AccessReadinessResult>;

    registerRoutes(
        server: FastifyInstance,
    ): Promise<void>;
}
