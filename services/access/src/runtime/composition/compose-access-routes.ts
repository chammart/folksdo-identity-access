// services/access/src/runtime/composition/compose-access-routes.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS ROUTES
// -----------------------------------------------------------------------------
// Runtime composition for Access Operations™ HTTP route registration.
//
// Purpose:
//   • bind the composed Access API to Fastify
//   • inject transport validation and request-context resolution
//   • expose one route-registration function to the runtime
//
// Boundary:
//   • does not create the Fastify server
//   • does not resolve authentication directly
//   • contains no business behavior
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
} from "fastify";

import {
    registerAccessRoutes,
    type AccessApi,
    type AccessApiRequestContextResolver,
    type AccessApiValidation,
} from "../../api";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessRoutesInput {
    readonly api:
    AccessApi;

    readonly contextResolver:
    AccessApiRequestContextResolver;

    readonly validation:
    AccessApiValidation;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ComposedAccessRoutes {
    register(
        server: FastifyInstance,
    ): Promise<void>;
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessRoutes(
    input:
    ComposeAccessRoutesInput,
): ComposedAccessRoutes {
    return {
        register:
            async (
                server,
            ) =>
                registerAccessRoutes(
                    server,
                    {
                        api:
                            input.api,

                        contextResolver:
                            input.contextResolver,

                        validation:
                            input.validation,
                    },
                ),
    };
}
