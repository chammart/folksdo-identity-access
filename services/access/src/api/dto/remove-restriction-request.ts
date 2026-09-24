// services/access/src/api/dto/remove-restriction-request.ts
// -----------------------------------------------------------------------------
// REMOVE RESTRICTION REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for removing an active Access restriction.
// -----------------------------------------------------------------------------

export interface ApiRemoveRestrictionRequest {
    readonly restrictionId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}