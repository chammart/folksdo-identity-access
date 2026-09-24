// services/access/src/reactions/tenant/on-tenant-activated.ts
// -----------------------------------------------------------------------------
// ON TENANT ACTIVATED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-activated business event.
//
// Trigger:
//   tenant.activated
//
// Purpose:
//   • update the Access-known Tenant fact to active
//   • establish Tenant eligibility for authorization evaluation
//   • activate Access state waiting for a valid Tenant lifecycle
//   • preserve Tenant Operations™ ownership of Tenant activation
//
// Boundary:
//   • does not activate the Tenant
//   • does not create Tenant roles or assignments
//   • does not mutate Access state directly
//   • invokes an Access-owned application operation
//   • contains no transport acknowledgment or retry behavior
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

export const tenantActivatedSubject =
    "tenant.activated";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface TenantActivatedPayload {
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ActivateTenantAuthorizationRequest {
    readonly tenantId: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ActivateTenantAuthorizationResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Tenant-scoped Access records activated.
     */
    readonly affectedAuthorizationCount: number;
}

/**
 * Access-owned operation that applies the authorization consequences of a
 * Tenant becoming active.
 */
export interface ActivateTenantAuthorizationOperation {
    execute(
        request: ActivateTenantAuthorizationRequest,
    ): Promise<ActivateTenantAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantActivatedReactionInput {
    readonly activateTenantAuthorization:
    ActivateTenantAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantActivatedReaction(
    input: CreateOnTenantActivatedReactionInput,
): AccessReactionHandler<TenantActivatedPayload> {
    const {
        activateTenantAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantActivatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantActivatedSubject
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
                await activateTenantAuthorization.execute({
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