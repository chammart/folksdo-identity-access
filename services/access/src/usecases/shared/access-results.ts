// services/access/src/usecases/access-results.ts
// -----------------------------------------------------------------------------
// ACCESS RESULTS
// -----------------------------------------------------------------------------
// Provider-neutral Access use case result contracts.
//
// Boundary:
//   • exposes stable application results
//   • prevents canonical persistence state from leaking through the API
//   • contains no HTTP, database or authentication-provider concerns
//   • preserves Access Operations™ ownership
// -----------------------------------------------------------------------------

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentScope,
    PermissionAssignmentState,
    PermissionAssignmentType,
    PermissionClassification,
    PermissionState,
    RoleAssignmentState,
    RoleAssignmentStatus,
    RoleLifecycleStatus,
    RoleState,
    RoleType,
} from "../../state";

import type {
    AuthorizationDecision,
    AuthorizationDecisionEvidence,
    AuthorizationDecisionReasonCode,
    AuthorizationDecisionValue,
} from "../../authorization";

// -----------------------------------------------------------------------------
// PERMISSION RESULT
// -----------------------------------------------------------------------------

export interface PermissionResult {
    readonly permissionId: string;

    readonly service: string;

    readonly resource: string;

    readonly action: string;

    readonly displayName: string;

    readonly description: string;

    readonly classification: PermissionClassification;

    readonly createdAt: string;
}

// -----------------------------------------------------------------------------
// ROLE RESULT
// -----------------------------------------------------------------------------

export interface RoleResult {
    readonly roleId: string;

    readonly key: string;

    readonly roleType: RoleType;

    readonly tenantId?: string;

    readonly name: string;

    readonly description: string;

    readonly permissionIds: readonly string[];

    readonly lifecycleStatus: RoleLifecycleStatus;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly archivedAt?: string;

    readonly archivedBy?: string;

    readonly restoredAt?: string;

    readonly restoredBy?: string;
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT RESULT
// -----------------------------------------------------------------------------

export interface RoleAssignmentResult {
    readonly assignmentId: string;

    readonly membershipId: string;

    readonly roleId: string;

    readonly tenantId: string;

    readonly status: RoleAssignmentStatus;

    readonly assignedBy: string;

    readonly effectiveFrom: string;

    readonly expiresAt?: string;

    readonly activatedAt?: string;

    readonly suspensionSources:
    RoleAssignmentState["suspensionSources"];

    readonly suspendedAt?: string;

    readonly reactivatedAt?: string;

    readonly archiveSource?:
    RoleAssignmentState["archiveSource"];

    readonly archivedAt?: string;

    readonly expiredAt?: string;

    readonly removedAt?: string;

    readonly removedBy?: string;

    readonly createdAt: string;

    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT RESULT
// -----------------------------------------------------------------------------

export interface PermissionAssignmentResult {
    readonly assignmentId: string;

    readonly membershipId: string;

    readonly tenantId: string;

    readonly permissionId: string;

    readonly assignmentType: PermissionAssignmentType;

    readonly scope: PermissionAssignmentScope;

    readonly status:
    PermissionAssignmentState["status"];

    readonly assignedBy: string;

    readonly effectiveFrom: string;

    readonly expiresAt?: string;

    readonly activatedAt?: string;

    readonly suspensionSources:
    PermissionAssignmentState["suspensionSources"];

    readonly suspendedAt?: string;

    readonly reactivatedAt?: string;

    readonly archiveSource?:
    PermissionAssignmentState["archiveSource"];

    readonly archivedAt?: string;

    readonly expiredAt?: string;

    readonly revokedAt?: string;

    readonly revokedBy?: string;

    readonly createdAt: string;

    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// ACCESS ASSIGNMENT RESULT
// -----------------------------------------------------------------------------

export type AccessAssignmentResult =
    | RoleAssignmentResult
    | PermissionAssignmentResult;

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY RESULT
// -----------------------------------------------------------------------------

export interface AccessPolicyResult {
    readonly policyId: string;

    readonly name: string;

    readonly scope:
    AuthorizationPolicyState["scope"];

    readonly tenantId?: string;

    readonly version: number;

    readonly lifecycleStatus:
    AuthorizationPolicyState["lifecycleStatus"];

    readonly evaluationRules:
    AuthorizationPolicyState["evaluationRules"];

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly activatedAt?: string;

    readonly archivedAt?: string;

    readonly archivedBy?: string;
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION RESULT
// -----------------------------------------------------------------------------

export interface AccessRestrictionResult {
    readonly restrictionId: string;

    readonly tenantId?: string;

    readonly target:
    AccessRestrictionState["target"];

    readonly restrictionReason: string;

    readonly status:
    AccessRestrictionState["status"];

    readonly effectiveFrom: string;

    readonly expiresAt?: string;

    readonly createdBy: string;

    readonly createdAt: string;

    readonly updatedAt: string;

    readonly expiredAt?: string;

    readonly removedAt?: string;

    readonly removedBy?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION RESULT
// -----------------------------------------------------------------------------

export interface AccessAuthorizationResult {
    readonly decisionId: string;

    readonly decision: AuthorizationDecisionValue;

    readonly reasonCode: AuthorizationDecisionReasonCode;

    readonly membershipId: string;

    readonly tenantId: string;

    readonly permissionId?: string;

    readonly permissionKey: string;

    readonly resourceType?: string;

    readonly resourceId?: string;

    readonly evaluatedAt: string;

    readonly evidence:
    readonly AuthorizationDecisionEvidence[];
}

// -----------------------------------------------------------------------------
// EFFECTIVE PERMISSION RESULT
// -----------------------------------------------------------------------------

export interface EffectivePermissionResult {
    readonly permission: PermissionResult;

    readonly effect: "grant" | "deny";

    readonly source:
    | "role_assignment"
    | "permission_assignment";

    readonly sourceId: string;

    readonly effectiveFrom: string;

    readonly expiresAt?: string;
}

// -----------------------------------------------------------------------------
// CURRENT ACCESS RESULT
// -----------------------------------------------------------------------------

export interface CurrentAccessResult {
    readonly identityId: string;

    readonly membershipId: string;

    readonly tenantId: string;

    readonly membershipIsValid: boolean;

    readonly effectivePermissions:
    readonly EffectivePermissionResult[];

    readonly evaluatedAt: string;
}

// -----------------------------------------------------------------------------
// RESULT MAPPERS
// -----------------------------------------------------------------------------

export function toPermissionResult(
    permission: PermissionState,
): PermissionResult {
    return {
        permissionId:
            permission.permissionId,

        service:
            permission.service,

        resource:
            permission.resource,

        action:
            permission.action,

        displayName:
            permission.displayName,

        description:
            permission.description,

        classification:
            permission.classification,

        createdAt:
            permission.createdAt,
    };
}

export function toRoleResult(
    role: RoleState,
): RoleResult {
    return {
        roleId:
            role.roleId,

        key:
            role.key
            ?? role.roleId,

        roleType:
            role.roleType,

        tenantId:
            role.tenantId,

        name:
            role.name,

        description:
            role.description,

        permissionIds: [
            ...role.permissionIds,
        ],

        lifecycleStatus:
            role.lifecycleStatus,

        createdAt:
            role.createdAt,

        updatedAt:
            role.updatedAt,

        archivedAt:
            role.archivedAt,

        archivedBy:
            role.archivedBy,

        restoredAt:
            role.restoredAt,

        restoredBy:
            role.restoredBy,
    };
}

export function toRoleAssignmentResult(
    assignment: RoleAssignmentState,
): RoleAssignmentResult {
    return {
        assignmentId:
            assignment.assignmentId,

        membershipId:
            assignment.membershipId,

        roleId:
            assignment.roleId,

        tenantId:
            assignment.tenantId,

        status:
            assignment.status,

        assignedBy:
            assignment.assignedBy,

        effectiveFrom:
            assignment.effectiveFrom,

        expiresAt:
            assignment.expiresAt,

        activatedAt:
            assignment.activatedAt,

        suspensionSources:
            assignment.suspensionSources,

        suspendedAt:
            assignment.suspendedAt,

        reactivatedAt:
            assignment.reactivatedAt,

        archiveSource:
            assignment.archiveSource,

        archivedAt:
            assignment.archivedAt,

        expiredAt:
            assignment.expiredAt,

        removedAt:
            assignment.removedAt,

        removedBy:
            assignment.removedBy,

        createdAt:
            assignment.createdAt,

        updatedAt:
            assignment.updatedAt,
    };
}

export function toPermissionAssignmentResult(
    assignment: PermissionAssignmentState,
): PermissionAssignmentResult {
    return {
        assignmentId:
            assignment.assignmentId,

        membershipId:
            assignment.membershipId,

        tenantId:
            assignment.tenantId,

        permissionId:
            assignment.permissionId,

        assignmentType:
            assignment.assignmentType,

        scope:
            assignment.scope,

        status:
            assignment.status,

        assignedBy:
            assignment.assignedBy,

        effectiveFrom:
            assignment.effectiveFrom,

        expiresAt:
            assignment.expiresAt,

        activatedAt:
            assignment.activatedAt,

        suspensionSources:
            assignment.suspensionSources,

        suspendedAt:
            assignment.suspendedAt,

        reactivatedAt:
            assignment.reactivatedAt,

        archiveSource:
            assignment.archiveSource,

        archivedAt:
            assignment.archivedAt,

        expiredAt:
            assignment.expiredAt,

        revokedAt:
            assignment.revokedAt,

        revokedBy:
            assignment.revokedBy,

        createdAt:
            assignment.createdAt,

        updatedAt:
            assignment.updatedAt,
    };
}

export function toAccessPolicyResult(
    policy: AuthorizationPolicyState,
): AccessPolicyResult {
    return {
        policyId:
            policy.policyId,

        name:
            policy.name,

        scope:
            policy.scope,

        tenantId:
            policy.tenantId,

        version:
            policy.version,

        lifecycleStatus:
            policy.lifecycleStatus,

        evaluationRules:
            policy.evaluationRules,

        createdAt:
            policy.createdAt,

        updatedAt:
            policy.updatedAt,

        activatedAt:
            policy.activatedAt,

        archivedAt:
            policy.archivedAt,

        archivedBy:
            policy.archivedBy,
    };
}

export function toAccessRestrictionResult(
    restriction: AccessRestrictionState,
): AccessRestrictionResult {
    return {
        restrictionId:
            restriction.restrictionId,

        tenantId:
            restriction.tenantId,

        target:
            restriction.target,

        restrictionReason:
            restriction.restrictionReason,

        status:
            restriction.status,

        effectiveFrom:
            restriction.effectiveFrom,

        expiresAt:
            restriction.expiresAt,

        createdBy:
            restriction.createdBy,

        createdAt:
            restriction.createdAt,

        updatedAt:
            restriction.updatedAt,

        expiredAt:
            restriction.expiredAt,

        removedAt:
            restriction.removedAt,

        removedBy:
            restriction.removedBy,
    };
}

export function toAccessAuthorizationResult(
    decisionId: string,
    decision: AuthorizationDecision,
): AccessAuthorizationResult {
    return {
        decisionId,

        decision:
            decision.decision,

        reasonCode:
            decision.reasonCode,

        membershipId:
            decision.membershipId,

        tenantId:
            decision.tenantId,

        permissionId:
            decision.permissionId,

        permissionKey:
            decision.permissionKey,

        resourceType:
            decision.resourceType,

        resourceId:
            decision.resourceId,

        evaluatedAt:
            decision.evaluatedAt,

        evidence:
            decision.evidence,
    };
}
// -----------------------------------------------------------------------------
// IDENTITY ACCESS SUSPENSION RESULT
// -----------------------------------------------------------------------------

export interface IdentityAccessSuspensionResult {
    readonly identityId: string;

    readonly status: "disabled";

    readonly suspendedAt: string;

    readonly changed: boolean;

    readonly suspendedRoleAssignmentCount: number;

    readonly suspendedPermissionAssignmentCount: number;
}
