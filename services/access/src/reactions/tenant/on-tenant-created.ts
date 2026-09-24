// services/access/src/reactions/tenant/on-tenant-created.ts
// -----------------------------------------------------------------------------
// ON TENANT CREATED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-created business event.
//
// Trigger:
//   tenant.created
//
// Purpose:
//   • record the Tenant as an Access-known business fact
//   • preserve Tenant Operations™ ownership of Tenant lifecycle
//   • establish the Tenant boundary required by tenant-scoped authorization
//   • support deterministic replay and idempotent processing
//
// Boundary:
//   • does not create or activate the Tenant
//   • does not create Tenant roles or assignments
//   • does not manipulate persistence directly
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

export const tenantCreatedSubject =
    "tenant.created";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

/**
 * Tenant-owned event payload consumed by Access Operations™.
 *
 * Access intentionally consumes only the identifier required to maintain its
 * local Known Tenant fact.
 */
export interface TenantCreatedPayload {
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface RecordKnownTenantRequest {
    readonly tenantId: string;

    readonly status: "provisioning";

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface RecordKnownTenantResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly changed: boolean;
}

/**
 * Narrow contract satisfied by the corresponding Access use case during
 * runtime composition.
 */
export interface RecordKnownTenantOperation {
    execute(
        request: RecordKnownTenantRequest,
    ): Promise<RecordKnownTenantResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantCreatedReactionInput {
    readonly recordKnownTenant:
    RecordKnownTenantOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantCreatedReaction(
    input: CreateOnTenantCreatedReactionInput,
): AccessReactionHandler<TenantCreatedPayload> {
    const {
        recordKnownTenant,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantCreatedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantCreatedSubject
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
                await recordKnownTenant.execute({
                    tenantId,

                    status:
                        "provisioning",

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
                result.changed,
            );
        },
    };
}