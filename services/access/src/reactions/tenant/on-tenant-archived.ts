// services/access/src/reactions/tenant/on-tenant-archived.ts
// -----------------------------------------------------------------------------
// ON TENANT ARCHIVED
// -----------------------------------------------------------------------------
// Reacts to the Tenant Operations™ tenant-archived business event.
//
// Trigger:
//   tenant.archived
//
// Purpose:
//   • update the Access-known Tenant fact to archived
//   • archive authorization state owned within the Tenant boundary
//   • permanently exclude the Tenant from authorization evaluation
//   • preserve historical authorization state for replay and audit
//
// Boundary:
//   • Tenant Operations™ owns Tenant archival
//   • Access Operations™ owns authorization archival consequences
//   • does not mutate roles, assignments, policies or restrictions directly
//   • invokes an Access-owned archival operation
//   • transport acknowledgment, retry and dead-letter behavior remain external
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

export const tenantArchivedSubject =
    "tenant.archived";

// -----------------------------------------------------------------------------
// EVENT PAYLOAD
// -----------------------------------------------------------------------------

export interface TenantArchivedPayload {
    readonly tenantId: string;

    /**
     * Optional Tenant-owned reason for archival.
     */
    readonly archiveReason?: string;
}

// -----------------------------------------------------------------------------
// ACCESS OPERATION
// -----------------------------------------------------------------------------

export interface ArchiveTenantAuthorizationRequest {
    readonly tenantId: string;

    readonly archiveReason?: string;

    readonly occurredAt: Date;

    readonly context: AccessReactionContext;
}

export interface ArchiveTenantAuthorizationResult {
    /**
     * Indicates whether the Access-known Tenant fact changed.
     */
    readonly knownFactChanged: boolean;

    /**
     * Number of Access-owned authorization records archived.
     */
    readonly affectedAuthorizationCount: number;
}

export interface ArchiveTenantAuthorizationOperation {
    execute(
        request: ArchiveTenantAuthorizationRequest,
    ): Promise<ArchiveTenantAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// REACTION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface CreateOnTenantArchivedReactionInput {
    readonly archiveTenantAuthorization:
    ArchiveTenantAuthorizationOperation;
}

// -----------------------------------------------------------------------------
// REACTION
// -----------------------------------------------------------------------------

export function createOnTenantArchivedReaction(
    input: CreateOnTenantArchivedReactionInput,
): AccessReactionHandler<TenantArchivedPayload> {
    const {
        archiveTenantAuthorization,
    } = input;

    return {
        async handle(
            event:
                AccessReactionEvent<TenantArchivedPayload>,
        ): Promise<AccessReactionResult> {
            if (
                event.metadata.subject
                !== tenantArchivedSubject
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
                    payload.archiveReason,
                    "archiveReason",
                );

            const result =
                await archiveTenantAuthorization.execute({
                    tenantId,
                    archiveReason:
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