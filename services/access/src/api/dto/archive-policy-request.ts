// services/access/src/api/dto/archive-policy-request.ts
// -----------------------------------------------------------------------------
// ARCHIVE POLICY REQUEST
// -----------------------------------------------------------------------------
// Named lifecycle command for archiving an authorization policy.
// -----------------------------------------------------------------------------

export interface ApiArchivePolicyRequest {
    readonly policyId: string;

    /**
     * Optional operator-provided audit reason.
     */
    readonly reason?: string;
}