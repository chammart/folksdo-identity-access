// services/access/src/runtime/composition/compose-access-adapters.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS ADAPTERS
// -----------------------------------------------------------------------------
// Runtime composition for Access-owned external provider adapters.
//
// Purpose:
//   • compose the optional BetterAuth authorization projection adapter
//   • preserve AccessProvider as the application-facing contract
//   • keep BetterAuth configuration outside business and use-case layers
//
// Boundary:
//   • does not make authorization decisions
//   • does not own BetterAuth lifecycle
//   • does not expose BetterAuth types beyond runtime composition
// -----------------------------------------------------------------------------

import {
    createBetterAuthAccessAdapter,
    type AccessProvider,
    type BetterAuthAccessApi,
    type ResolveBetterAuthMemberId,
} from "../../adapters";

// -----------------------------------------------------------------------------
// OPTIONAL BETTERAUTH INPUT
// -----------------------------------------------------------------------------

export interface AccessBetterAuthAdapterInput {
    readonly api:
    BetterAuthAccessApi;

    readonly createHeaders:
    () => Headers | Promise<Headers>;

    readonly resolveMemberId:
    ResolveBetterAuthMemberId;
}

// -----------------------------------------------------------------------------
// COMPOSITION INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessAdaptersInput {
    readonly betterAuth?:
    AccessBetterAuthAdapterInput;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ComposedAccessAdapters {
    readonly provider?:
    AccessProvider;
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessAdapters(
    input:
    ComposeAccessAdaptersInput = {},
): ComposedAccessAdapters {
    if (
        input.betterAuth === undefined
    ) {
        return {};
    }

    return {
        provider:
            createBetterAuthAccessAdapter({
                api:
                    input.betterAuth.api,

                createHeaders:
                    input.betterAuth.createHeaders,

                resolveMemberId:
                    input.betterAuth.resolveMemberId,
            }),
    };
}
