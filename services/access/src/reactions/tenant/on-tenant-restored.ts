// services/access/src/reactions/tenant/on-tenant-restored.ts
// -----------------------------------------------------------------------------
// ON TENANT RESTORED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-restored business event.
//
// Trigger:
//   tenant.tenant_restored
//
// Purpose:
//   • update the Access-known Tenant fact to active
//   • restore authorization state suspended by the Tenant lifecycle
//   • restore Tenant eligibility for authorization evaluation
//   • preserve unrelated suspension, restriction and policy causes
//
// Boundary:
//   • Tenant Operations™ owns Tenant restoration
//   • Access Operations™ owns authorization restoration consequences
//   • does not restore authorization blocked by another lifecycle source
//   • does not mutate Access state directly
//   • invokes an Access-owned restoration operation
// -----------------------------------------------------------------------------

import type {
    AccessReactionContext,
    AccessReactionEvent,
    AccessReactionHandler,
} from "../access-reaction-contracts";

import {
    accessReactionIgnored,
    accessReactionProcessed,
    type AccessReactionResult,
} from "../access-reaction-results";

import {
    buildAccessReactionContext,
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const tenantRestoredSubject =
    "tenant.tenant_restored";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface TenantRestoredPayload {
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface RestoreTenantAuthorizationRequest {
    readonly tenantId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface RestoreTenantAuthorizationResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Tenant-suspended authorization records restored.
     */
    readonly affectedAuthorizationCount: number;
}

export interface RestoreTenantAuthorizationOperation {
    execute(
        request: RestoreTenantAuthorizationRequest,
    ): Promise<RestoreTenantAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantRestoredReactionInput {
    readonly restoreTenantAuthorization:
    RestoreTenantAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantRestoredReaction(
    input: CreateOnTenantRestoredReactionInput,
): AccessReactionHandler<TenantRestoredPayload> {
    const {
        restoreTenantAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantRestoredPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantRestoredSubject
            ) {
                return accessReactionIgnored(
                    "event_subject_unsupported",
                );
            }

            const payload =
                requireReactionPayloadObject(
                    event.payload,
                );

            const tenantId =
                requireReactionString(
                    payload.tenantId,
                    "tenantId",
                );

            const result =
                await restoreTenantAuthorization.execute({
                    tenantId,

                    occurredAt:
                        reactionEventOccurredAt(
                            event,
                        ),

                    context:
                        buildAccessReactionContext(
                            event,
                        ),
                });

            return accessReactionProcessed(
                result.knownFactChanged
                || result.affectedAuthorizationCount > 0,
            );
        },
    };
}