// services/access/src/reactions/tenant/on-tenant-reactivated.ts
// -----------------------------------------------------------------------------
// ON TENANT REACTIVATED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-reactivated business event.
//
// Trigger:
//   tenant.reactivated
//
// Purpose:
//   • update the Access-known Tenant fact to active
//   • restore authorization state suspended by the Tenant lifecycle
//   • restore Tenant eligibility for authorization evaluation
//   • preserve unrelated suspension, restriction and policy causes
//
// Boundary:
//   • Tenant Operations™ owns Tenant reactivation
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

export const tenantReactivatedSubject =
    "tenant.reactivated";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface TenantReactivatedPayload {
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ReactivateTenantAuthorizationRequest {
    readonly tenantId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ReactivateTenantAuthorizationResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Tenant-suspended authorization records restored.
     */
    readonly affectedAuthorizationCount: number;
}

export interface ReactivateTenantAuthorizationOperation {
    execute(
        request: ReactivateTenantAuthorizationRequest,
    ): Promise<ReactivateTenantAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantReactivatedReactionInput {
    readonly reactivateTenantAuthorization:
    ReactivateTenantAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantReactivatedReaction(
    input: CreateOnTenantReactivatedReactionInput,
): AccessReactionHandler<TenantReactivatedPayload> {
    const {
        reactivateTenantAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantReactivatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantReactivatedSubject
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
                await reactivateTenantAuthorization.execute({
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