// services/access/src/authorization/effective-permission-resolver.ts
// -----------------------------------------------------------------------------
// EFFECTIVE PERMISSION RESOLVER
// -----------------------------------------------------------------------------
// Deterministic resolution of Role and direct Permission assignments.
//
// Purpose:
//   • resolve Permission grants inherited through Roles
//   • resolve direct Permission grants and denials
//   • enforce Membership, Tenant, resource and time scope
//   • exclude inactive, suspended, future, or expired assignments
//   • produce precedence candidates for authorization evaluation
//   • avoid infrastructure dependencies
//
// Boundary:
//   • consumes canonical Access-owned state
//   • performs no persistence or external queries
//   • does not evaluate Policies, Restrictions, or subscription capabilities
//   • does not produce the final authorization decision
//   • remains independent from the Access authorization facade
// -----------------------------------------------------------------------------

import type {
    PermissionAssignmentScope,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../state";

import type {
    PermissionPrecedenceCandidate,
} from "./permission-precedence";

// -----------------------------------------------------------------------------
// AUTHORIZATION SUBJECT
// -----------------------------------------------------------------------------

export interface EffectivePermissionSubject {
    /**
     * Membership through which Tenant authorization is evaluated.
     */
    readonly membershipId: string;

    /**
     * Tenant authorization boundary.
     */
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION RESOURCE
// -----------------------------------------------------------------------------

export interface EffectivePermissionResource {
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
// AUTHORIZATION REQUEST CONTEXT
// -----------------------------------------------------------------------------
// Minimal request contract required for effective Permission resolution.
//
// The complete Access authorization request may extend this contract at the
// package facade without creating a reverse dependency.
// -----------------------------------------------------------------------------

export interface EffectivePermissionRequest {
    readonly subject: EffectivePermissionSubject;

    readonly resource?: EffectivePermissionResource;

    /**
     * Current UTC timestamp.
     */
    readonly now: string;
}

// -----------------------------------------------------------------------------
// ROLE PERMISSION
// -----------------------------------------------------------------------------
// Role-to-Permission relationships may be stored in a projection or dedicated
// Access-owned association model.
//
// The authorization layer consumes only this provider-neutral representation.
// -----------------------------------------------------------------------------

export interface RolePermissionBinding {
    readonly roleId: string;

    readonly permissionId: string;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ResolveEffectivePermissionInput {
    readonly request: EffectivePermissionRequest;

    readonly permission: PermissionState;

    readonly roles:
    readonly RoleState[];

    readonly roleAssignments:
    readonly RoleAssignmentState[];

    readonly permissionAssignments:
    readonly PermissionAssignmentState[];

    readonly rolePermissionBindings:
    readonly RolePermissionBinding[];
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface EffectivePermissionResolution {
    readonly permissionId: string;

    readonly candidates:
    readonly PermissionPrecedenceCandidate[];
}

// -----------------------------------------------------------------------------
// RESOLVE EFFECTIVE PERMISSION
// -----------------------------------------------------------------------------

export function resolveEffectivePermission(
    input: ResolveEffectivePermissionInput,
): EffectivePermissionResolution {
    const candidates: PermissionPrecedenceCandidate[] = [];

    candidates.push(
        ...resolveRolePermissionCandidates(
            input,
        ),
    );

    candidates.push(
        ...resolveDirectPermissionCandidates(
            input,
        ),
    );

    return {
        permissionId: input.permission.permissionId,

        candidates,
    };
}

// -----------------------------------------------------------------------------
// ROLE PERMISSION CANDIDATES
// -----------------------------------------------------------------------------

function resolveRolePermissionCandidates(
    input: ResolveEffectivePermissionInput,
): readonly PermissionPrecedenceCandidate[] {
    const activeRoleIds = new Set(
        input.roles
            .filter(
                role =>
                    role.lifecycleStatus === "active",
            )
            .filter(
                role =>
                    role.roleType !== "tenant"
                    || role.tenantId
                    === input.request.subject.tenantId,
            )
            .map(
                role =>
                    role.roleId,
            ),
    );

    const roleIdsGrantingPermission = new Set(
        input.rolePermissionBindings
            .filter(
                binding =>
                    activeRoleIds.has(
                        binding.roleId,
                    ),
            )
            .filter(
                (binding) =>
                    binding.permissionId
                    === input.permission.permissionId,
            )
            .map(
                (binding) =>
                    binding.roleId,
            ),
    );

    return input.roleAssignments
        .filter(
            (assignment) =>
                roleIdsGrantingPermission.has(
                    assignment.roleId,
                ),
        )
        .filter(
            (assignment) =>
                assignment.membershipId
                === input.request.subject.membershipId,
        )
        .filter(
            (assignment) =>
                assignment.tenantId
                === input.request.subject.tenantId,
        )
        .filter(
            (assignment) =>
                isRoleAssignmentEffective(
                    assignment,
                    input.request.now,
                ),
        )
        .map(
            (assignment): PermissionPrecedenceCandidate => ({
                effect: "grant",

                source: "role_grant",

                sourceId: assignment.assignmentId,

                reason:
                    "Permission granted through an active Role Assignment.",
            }),
        );
}

// -----------------------------------------------------------------------------
// DIRECT PERMISSION CANDIDATES
// -----------------------------------------------------------------------------

function resolveDirectPermissionCandidates(
    input: ResolveEffectivePermissionInput,
): readonly PermissionPrecedenceCandidate[] {
    return input.permissionAssignments
        .filter(
            (assignment) =>
                assignment.permissionId
                === input.permission.permissionId,
        )
        .filter(
            (assignment) =>
                assignment.membershipId
                === input.request.subject.membershipId,
        )
        .filter(
            (assignment) =>
                assignment.tenantId
                === input.request.subject.tenantId,
        )
        .filter(
            (assignment) =>
                isPermissionAssignmentEffective(
                    assignment,
                    input.request.now,
                ),
        )
        .filter(
            (assignment) =>
                permissionScopeMatchesRequest(
                    assignment.scope,
                    input.request,
                ),
        )
        .map(
            (assignment): PermissionPrecedenceCandidate => ({
                effect:
                    assignment.assignmentType === "deny"
                        ? "deny"
                        : "grant",

                source:
                    assignment.assignmentType === "deny"
                        ? "direct_deny"
                        : "direct_grant",

                sourceId: assignment.assignmentId,

                reason:
                    assignment.assignmentType === "deny"
                        ? "Permission denied through a direct Permission Assignment."
                        : "Permission granted through a direct Permission Assignment.",
            }),
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
// PERMISSION ASSIGNMENT EFFECTIVENESS
// -----------------------------------------------------------------------------

function isPermissionAssignmentEffective(
    assignment: PermissionAssignmentState,
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
// PERMISSION SCOPE MATCHING
// -----------------------------------------------------------------------------

function permissionScopeMatchesRequest(
    scope: PermissionAssignmentScope,
    request: EffectivePermissionRequest,
): boolean {
    switch (scope.scopeType) {
        case "tenant":
            return true;

        case "resource_type":
            return (
                request.resource?.resourceType
                === scope.resourceType
            );

        case "resource_instance":
            return (
                request.resource?.resourceType
                === scope.resourceType
                && request.resource.resourceId
                === scope.resourceId
            );
    }
}