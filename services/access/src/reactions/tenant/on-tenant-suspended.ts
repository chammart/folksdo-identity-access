// services/access/src/reactions/tenant/on-tenant-suspended.ts
// -----------------------------------------------------------------------------
// ON TENANT SUSPENDED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-suspended business event.
//
// Trigger:
//   tenant.suspended
//
// Purpose:
//   • update the Access-known Tenant fact to suspended
//   • suspend authorization state associated with the Tenant
//   • prevent authorization within an invalid Tenant lifecycle
//   • preserve authorization history for replay and audit
//
// Boundary:
//   • Tenant Operations™ owns Tenant suspension
//   • Access Operations™ owns authorization suspension consequences
//   • does not manipulate roles, assignments or restrictions directly
//   • invokes an Access-owned suspension operation
//   • transport retry and acknowledgment remain worker responsibilities
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
    optionalReactionString,
    reactionEventOccurredAt,
    requireReactionPayloadObject,
    requireReactionString,
} from "../reaction-support";

// -----------------------------------------------------------------------------
// EVENT SUBJECT
// -----------------------------------------------------------------------------

export const tenantSuspendedSubject =
    "tenant.suspended";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface TenantSuspendedPayload {
    readonly tenantId: string;

    /**
     * Optional Tenant-owned reason for suspension.
     */
    readonly suspensionReason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface SuspendTenantAuthorizationRequest {
    readonly tenantId: string;

    readonly suspensionReason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface SuspendTenantAuthorizationResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access-owned authorization records suspended.
     */
    readonly affectedAuthorizationCount: number;
}

export interface SuspendTenantAuthorizationOperation {
    execute(
        request: SuspendTenantAuthorizationRequest,
    ): Promise<SuspendTenantAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantSuspendedReactionInput {
    readonly suspendTenantAuthorization:
    SuspendTenantAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantSuspendedReaction(
    input: CreateOnTenantSuspendedReactionInput,
): AccessReactionHandler<TenantSuspendedPayload> {
    const {
        suspendTenantAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantSuspendedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantSuspendedSubject
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

            const reason =
                optionalReactionString(
                    payload.suspensionReason,
                    "suspensionReason",
                );

            const result =
                await suspendTenantAuthorization.execute({
                    tenantId,
                    suspensionReason:
                        reason,

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