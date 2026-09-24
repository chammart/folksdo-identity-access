// services/access/src/authorization/authorization-evaluator.ts
// -----------------------------------------------------------------------------
// AUTHORIZATION EVALUATOR
// -----------------------------------------------------------------------------
// Deterministic Access authorization evaluation.
//
// Purpose:
//   • validate Membership authorization context
//   • resolve the requested Permission from the Access catalog
//   • combine Role-derived and direct Permission assignments
//   • apply direct Permission denial precedence
//   • evaluate Access Restrictions as independent authorization vetoes
//   • evaluate Authorization Policies as independent authorization vetoes
//   • enforce subscription capability requirements
//   • preserve deny-by-default authorization
//   • return auditable authorization decisions
//   • avoid infrastructure dependencies
//
// Evaluation order:
//
//   Membership validity
//   ↓
//   Permission Catalog resolution
//   ↓
//   effective Permission resolution
//   ↓
//   Access Restriction evaluation
//   ↓
//   Authorization Policy evaluation
//   ↓
//   subscription capability evaluation
//   ↓
//   final Allow decision
//
// Boundary:
//   • consumes canonical Access state and normalized evaluation results
//   • performs no persistence or external queries
//   • does not interpret opaque Policy rules
//   • does not resolve Known Facts from external services
//   • does not depend on the Access authorization facade
//   • does not depend on repositories, transport, workers, or runtime
// -----------------------------------------------------------------------------

import type {
    AccessRestrictionState,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../state";

import {
    createAccessPermissionKey,
    permissionMatchesRequest,
} from "./access-permissions";

import type {
    AccessPermissionRequest,
} from "./access-permissions";

import {
    createAllowAuthorizationDecision,
    createDenyAuthorizationDecision,
} from "./authorization-decision";

import type {
    AuthorizationDecision,
    AuthorizationDecisionEvidence,
} from "./authorization-decision";

import {
    resolveEffectivePermission,
} from "./effective-permission-resolver";

import type {
    RolePermissionBinding,
} from "./effective-permission-resolver";

import {
    resolvePermissionPrecedence,
} from "./permission-precedence";

import type {
    PermissionPrecedenceCandidate,
    PermissionPrecedenceResolution,
} from "./permission-precedence";

// -----------------------------------------------------------------------------
// AUTHORIZATION SUBJECT
// -----------------------------------------------------------------------------

export interface AuthorizationEvaluationSubject {
    /**
     * Membership through which Tenant authorization is evaluated.
     */
    readonly membershipId: string;

    /**
     * Tenant authorization boundary.
     */
    readonly tenantId: string;

    /**
     * Whether the Membership context is currently valid for authorization.
     *
     * This value is derived from Access-owned Known Membership facts.
     */
    readonly membershipIsValid: boolean;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION RESOURCE
// -----------------------------------------------------------------------------

export interface AuthorizationEvaluationResource {
    /**
     * Protected resource type.
     */
    readonly resourceType: string;

    /**
     * Optional protected resource instance identifier.
     */
    readonly resourceId?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION REQUEST
// -----------------------------------------------------------------------------
// Minimal request contract required by deterministic authorization evaluation.
//
// The public Access authorization facade may consume or extend this contract
// without creating a reverse dependency from the evaluator.
// -----------------------------------------------------------------------------

export interface AuthorizationEvaluationRequest {
    /**
     * Membership and Tenant authorization context.
     */
    readonly subject: AuthorizationEvaluationSubject;

    /**
     * Requested business Permission.
     */
    readonly permission: AccessPermissionRequest;

    /**
     * Optional protected resource scope.
     */
    readonly resource?: AuthorizationEvaluationResource;

    /**
     * Optional subscription capability required by the protected action.
     */
    readonly requiredSubscriptionCapability?: string;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// POLICY RESULT
// -----------------------------------------------------------------------------
// AuthorizationPolicyState intentionally preserves opaque Policy rules.
//
// A deterministic Policy interpreter evaluates those rules separately and
// provides normalized results through this contract.
//
// Policies may deny authorization, but they never establish a Permission grant.
// An "allow" result only means that the evaluated Policy does not veto the
// authorization request.
// -----------------------------------------------------------------------------

export interface AuthorizationPolicyResult {
    /**
     * Evaluated Authorization Policy identifier.
     */
    readonly policyId: string;

    /**
     * Normalized Policy evaluation outcome.
     */
    readonly effect:
    | "allow"
    | "deny";

    /**
     * Stable explanation suitable for audit and diagnostics.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// SUBSCRIPTION CAPABILITY RESULT
// -----------------------------------------------------------------------------
// Subscription capabilities originate from Access-owned Known Subscription
// facts.
//
// The evaluator consumes only this normalized, provider-neutral contract.
// -----------------------------------------------------------------------------

export interface AuthorizationSubscriptionCapabilityResult {
    /**
     * Stable subscription capability key.
     */
    readonly capability: string;

    /**
     * Whether the capability is currently available.
     */
    readonly available: boolean;

    /**
     * Identifier of the Known Subscription fact or capability record.
     */
    readonly sourceId?: string;

    /**
     * Stable explanation suitable for audit and diagnostics.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface EvaluateAuthorizationInput {
    readonly request: AuthorizationEvaluationRequest;

    readonly permissions:
    readonly PermissionState[];

    readonly roles:
    readonly RoleState[];

    readonly roleAssignments:
    readonly RoleAssignmentState[];

    readonly permissionAssignments:
    readonly PermissionAssignmentState[];

    readonly rolePermissionBindings:
    readonly RolePermissionBinding[];

    readonly restrictions:
    readonly AccessRestrictionState[];

    readonly policyResults:
    readonly AuthorizationPolicyResult[];

    readonly subscriptionCapabilities:
    readonly AuthorizationSubscriptionCapabilityResult[];
}

// -----------------------------------------------------------------------------
// EVALUATE AUTHORIZATION
// -----------------------------------------------------------------------------

export function evaluateAuthorization(
    input: EvaluateAuthorizationInput,
): AuthorizationDecision {
    const permissionKey =
        createAccessPermissionKey(
            input.request.permission,
        );

    // -------------------------------------------------------------------------
    // MEMBERSHIP VALIDITY GATE
    // -------------------------------------------------------------------------

    if (!input.request.subject.membershipIsValid) {
        return createDenyAuthorizationDecision({
            reasonCode: "membership_invalid",

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence: [
                {
                    source: "membership",

                    sourceId:
                        input.request.subject.membershipId,

                    reason:
                        "Membership is not valid for authorization.",
                },
            ],
        });
    }

    // -------------------------------------------------------------------------
    // PERMISSION CATALOG GATE
    // -------------------------------------------------------------------------

    const permission =
        input.permissions.find(
            (candidate) =>
                permissionMatchesRequest(
                    candidate,
                    input.request.permission,
                ),
        );

    if (!permission) {
        return createDenyAuthorizationDecision({
            reasonCode: "permission_not_found",

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence: [
                {
                    source: "permission_catalog",

                    reason:
                        "Requested Permission does not exist in the Access catalog.",
                },
            ],
        });
    }

    // -------------------------------------------------------------------------
    // EFFECTIVE PERMISSION GATE
    // -------------------------------------------------------------------------

    const effectivePermission =
        resolveEffectivePermission({
            request: input.request,

            permission,

            roles:
                input.roles,

            roleAssignments:
                input.roleAssignments,

            permissionAssignments:
                input.permissionAssignments,

            rolePermissionBindings:
                input.rolePermissionBindings,
        });

    const permissionResolution =
        resolvePermissionPrecedence(
            effectivePermission.candidates,
        );

    const permissionEvidence =
        createPermissionDecisionEvidence(
            effectivePermission.candidates,
        );

    if (permissionResolution.effect === "deny") {
        return createDenyAuthorizationDecision({
            reasonCode:
                resolvePermissionDenyReasonCode(
                    permissionResolution,
                ),

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionId:
                permission.permissionId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence:
                permissionEvidence.length > 0
                    ? permissionEvidence
                    : [
                        {
                            source: "default",

                            reason:
                                "No effective Permission grant was found.",
                        },
                    ],
        });
    }

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTION GATE
    // -------------------------------------------------------------------------

    const effectiveRoleIds =
        resolveEffectiveRoleIds(
            input.roleAssignments,
            input.request,
        );

    const matchingRestrictions =
        resolveMatchingRestrictions(
            input.restrictions,
            input.request,
            permission,
            effectiveRoleIds,
        );

    if (matchingRestrictions.length > 0) {
        return createDenyAuthorizationDecision({
            reasonCode: "access_restricted",

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionId:
                permission.permissionId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence:
                matchingRestrictions.map(
                    (
                        restriction,
                    ): AuthorizationDecisionEvidence => ({
                        source: "access_restriction",

                        sourceId:
                            restriction.restrictionId,

                        reason:
                            restriction.restrictionReason,
                    }),
                ),
        });
    }

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICY GATE
    // -------------------------------------------------------------------------

    const denyingPolicies =
        input.policyResults
            .filter(
                (result) =>
                    result.effect === "deny",
            )
            .sort(
                comparePolicyResults,
            );

    if (denyingPolicies.length > 0) {
        return createDenyAuthorizationDecision({
            reasonCode: "policy_denied",

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionId:
                permission.permissionId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence:
                denyingPolicies.map(
                    (
                        result,
                    ): AuthorizationDecisionEvidence => ({
                        source: "authorization_policy",

                        sourceId:
                            result.policyId,

                        reason:
                            result.reason,
                    }),
                ),
        });
    }

    // -------------------------------------------------------------------------
    // SUBSCRIPTION CAPABILITY GATE
    // -------------------------------------------------------------------------

    const capabilityDecision =
        evaluateRequiredSubscriptionCapability(
            input.request.requiredSubscriptionCapability,
            input.subscriptionCapabilities,
        );

    if (
        capabilityDecision
        && !capabilityDecision.available
    ) {
        return createDenyAuthorizationDecision({
            reasonCode:
                "subscription_capability_denied",

            membershipId:
                input.request.subject.membershipId,

            tenantId:
                input.request.subject.tenantId,

            permissionId:
                permission.permissionId,

            permissionKey,

            resourceType:
                input.request.resource?.resourceType,

            resourceId:
                input.request.resource?.resourceId,

            evaluatedAt:
                input.request.now,

            evidence: [
                {
                    source:
                        "subscription_capability",

                    sourceId:
                        capabilityDecision.sourceId,

                    reason:
                        capabilityDecision.reason,
                },
            ],
        });
    }

    // -------------------------------------------------------------------------
    // ALLOW
    // -------------------------------------------------------------------------

    return createAllowAuthorizationDecision({
        reasonCode: "permission_granted",

        membershipId:
            input.request.subject.membershipId,

        tenantId:
            input.request.subject.tenantId,

        permissionId:
            permission.permissionId,

        permissionKey,

        resourceType:
            input.request.resource?.resourceType,

        resourceId:
            input.request.resource?.resourceId,

        evaluatedAt:
            input.request.now,

        evidence: [
            ...permissionEvidence,

            ...createAllowPolicyEvidence(
                input.policyResults,
            ),

            ...createSubscriptionCapabilityEvidence(
                capabilityDecision,
            ),
        ],
    });
}

// -----------------------------------------------------------------------------
// EFFECTIVE ROLE IDENTIFIERS
// -----------------------------------------------------------------------------

function resolveEffectiveRoleIds(
    assignments: readonly RoleAssignmentState[],
    request: AuthorizationEvaluationRequest,
): ReadonlySet<string> {
    return new Set(
        assignments
            .filter(
                (assignment) =>
                    assignment.membershipId
                    === request.subject.membershipId,
            )
            .filter(
                (assignment) =>
                    assignment.tenantId
                    === request.subject.tenantId,
            )
            .filter(
                (assignment) =>
                    isRoleAssignmentEffective(
                        assignment,
                        request.now,
                    ),
            )
            .map(
                (assignment) =>
                    assignment.roleId,
            ),
    );
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT EFFECTIVENESS
// -----------------------------------------------------------------------------

function isRoleAssignmentEffective(
    assignment: RoleAssignmentState,
    now: string,
): boolean {
    return (
        assignment.status === "active"
        && assignment.suspensionSources.length === 0
        && assignment.effectiveFrom <= now
        && (
            !assignment.expiresAt
            || assignment.expiresAt > now
        )
    );
}

// -----------------------------------------------------------------------------
// MATCHING RESTRICTIONS
// -----------------------------------------------------------------------------

function resolveMatchingRestrictions(
    restrictions: readonly AccessRestrictionState[],
    request: AuthorizationEvaluationRequest,
    permission: PermissionState,
    effectiveRoleIds: ReadonlySet<string>,
): readonly AccessRestrictionState[] {
    return restrictions
        .filter(
            (restriction) =>
                restriction.status === "active",
        )
        .filter(
            (restriction) =>
                restriction.effectiveFrom
                <= request.now,
        )
        .filter(
            (restriction) =>
                !restriction.expiresAt
                || restriction.expiresAt
                > request.now,
        )
        .filter(
            (restriction) =>
                !restriction.tenantId
                || restriction.tenantId
                === request.subject.tenantId,
        )
        .filter(
            (restriction) =>
                restrictionMatchesRequest(
                    restriction,
                    request,
                    permission,
                    effectiveRoleIds,
                ),
        )
        .sort(
            compareRestrictions,
        );
}

// -----------------------------------------------------------------------------
// RESTRICTION MATCHING
// -----------------------------------------------------------------------------

function restrictionMatchesRequest(
    restriction: AccessRestrictionState,
    request: AuthorizationEvaluationRequest,
    permission: PermissionState,
    effectiveRoleIds: ReadonlySet<string>,
): boolean {
    switch (restriction.target.targetType) {
        case "membership":
            return (
                restriction.target.membershipId
                === request.subject.membershipId
            );

        case "tenant":
            return (
                restriction.target.tenantId
                === request.subject.tenantId
            );

        case "permission":
            return (
                restriction.target.permissionId
                === permission.permissionId
            );

        case "role":
            return effectiveRoleIds.has(
                restriction.target.roleId,
            );

        case "resource_type":
            return (
                request.resource?.resourceType
                === restriction.target.resourceType
            );

        case "resource_instance":
            return (
                request.resource?.resourceType
                === restriction.target.resourceType
                && request.resource.resourceId
                === restriction.target.resourceId
            );
    }
}

// -----------------------------------------------------------------------------
// REQUIRED SUBSCRIPTION CAPABILITY
// -----------------------------------------------------------------------------

function evaluateRequiredSubscriptionCapability(
    requiredCapability: string | undefined,
    capabilities:
        readonly AuthorizationSubscriptionCapabilityResult[],
): AuthorizationSubscriptionCapabilityResult | undefined {
    if (!requiredCapability) {
        return undefined;
    }

    const normalizedRequiredCapability =
        normalizeCapabilityKey(
            requiredCapability,
        );

    const capability =
        capabilities.find(
            (candidate) =>
                normalizeCapabilityKey(
                    candidate.capability,
                )
                === normalizedRequiredCapability,
        );

    if (capability) {
        return capability;
    }

    return {
        capability:
            normalizedRequiredCapability,

        available: false,

        reason:
            "Required subscription capability is not available.",
    };
}

// -----------------------------------------------------------------------------
// PERMISSION DECISION EVIDENCE
// -----------------------------------------------------------------------------

function createPermissionDecisionEvidence(
    candidates: readonly PermissionPrecedenceCandidate[],
): readonly AuthorizationDecisionEvidence[] {
    return [
        ...candidates,
    ]
        .sort(
            comparePermissionCandidates,
        )
        .map(
            (
                candidate,
            ): AuthorizationDecisionEvidence => ({
                source:
                    mapPermissionEvidenceSource(
                        candidate.source,
                    ),

                sourceId:
                    candidate.sourceId,

                reason:
                    candidate.reason,
            }),
        );
}

// -----------------------------------------------------------------------------
// ALLOW POLICY EVIDENCE
// -----------------------------------------------------------------------------

function createAllowPolicyEvidence(
    results: readonly AuthorizationPolicyResult[],
): readonly AuthorizationDecisionEvidence[] {
    return results
        .filter(
            (result) =>
                result.effect === "allow",
        )
        .sort(
            comparePolicyResults,
        )
        .map(
            (
                result,
            ): AuthorizationDecisionEvidence => ({
                source:
                    "authorization_policy",

                sourceId:
                    result.policyId,

                reason:
                    result.reason,
            }),
        );
}

// -----------------------------------------------------------------------------
// SUBSCRIPTION CAPABILITY EVIDENCE
// -----------------------------------------------------------------------------

function createSubscriptionCapabilityEvidence(
    result:
        AuthorizationSubscriptionCapabilityResult
        | undefined,
): readonly AuthorizationDecisionEvidence[] {
    if (
        !result
        || !result.available
    ) {
        return [];
    }

    return [
        {
            source:
                "subscription_capability",

            sourceId:
                result.sourceId,

            reason:
                result.reason,
        },
    ];
}

// -----------------------------------------------------------------------------
// PERMISSION EVIDENCE SOURCE
// -----------------------------------------------------------------------------

function mapPermissionEvidenceSource(
    source: PermissionPrecedenceCandidate["source"],
): AuthorizationDecisionEvidence["source"] {
    switch (source) {
        case "role_grant":
            return "role_assignment";

        case "direct_grant":
        case "direct_deny":
            return "permission_assignment";

        case "default_deny":
            return "default";
    }
}

// -----------------------------------------------------------------------------
// PERMISSION DENY REASON
// -----------------------------------------------------------------------------

function resolvePermissionDenyReasonCode(
    resolution: PermissionPrecedenceResolution,
): AuthorizationDecision["reasonCode"] {
    switch (resolution.source) {
        case "direct_deny":
            return "permission_denied";

        case "default_deny":
            return "default_deny";

        case "role_grant":
        case "direct_grant":
            return "permission_not_effective";
    }
}

// -----------------------------------------------------------------------------
// STABLE PERMISSION CANDIDATE ORDER
// -----------------------------------------------------------------------------

function comparePermissionCandidates(
    left: PermissionPrecedenceCandidate,
    right: PermissionPrecedenceCandidate,
): number {
    const sourceDifference =
        left.source.localeCompare(
            right.source,
        );

    if (sourceDifference !== 0) {
        return sourceDifference;
    }

    return (left.sourceId ?? "")
        .localeCompare(
            right.sourceId ?? "",
        );
}

// -----------------------------------------------------------------------------
// STABLE RESTRICTION ORDER
// -----------------------------------------------------------------------------

function compareRestrictions(
    left: AccessRestrictionState,
    right: AccessRestrictionState,
): number {
    return left.restrictionId.localeCompare(
        right.restrictionId,
    );
}

// -----------------------------------------------------------------------------
// STABLE POLICY RESULT ORDER
// -----------------------------------------------------------------------------

function comparePolicyResults(
    left: AuthorizationPolicyResult,
    right: AuthorizationPolicyResult,
): number {
    return left.policyId.localeCompare(
        right.policyId,
    );
}

// -----------------------------------------------------------------------------
// NORMALIZE CAPABILITY KEY
// -----------------------------------------------------------------------------

function normalizeCapabilityKey(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase();
}