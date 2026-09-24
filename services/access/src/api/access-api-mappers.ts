// services/access/src/api/access-api-mappers.ts
// -----------------------------------------------------------------------------
// ACCESS API MAPPERS
// -----------------------------------------------------------------------------
// Maps Access Operations™ application results into stable public API DTOs.
//
// Purpose:
//   • prevent application result contracts from leaking directly into HTTP
//   • centralize transport representation
//   • require explicit enrichment for information not owned by result contracts
//   • avoid fabricating identifiers, actors, role composition or policy details
//
// Boundary:
//   • contains no Fastify or HTTP behavior
//   • contains no persistence access
//   • contains no authorization decisions
//   • does not mutate application results
//   • does not infer unavailable business facts
// -----------------------------------------------------------------------------

import type {
    AccessAssignmentResult,
    AccessAuthorizationResult,
    AccessPolicyResult,
    AccessRestrictionResult,
    PermissionAssignmentResult,
    PermissionResult,
    RoleAssignmentResult,
    RoleResult,
} from "../usecases";

import type {
    AccessRestrictionDto,
    AccessRestrictionScope,
    AccessRestrictionSubjectType,
    AuthorizationDecisionDto,
    AuthorizationPolicyConditionDto,
    AuthorizationPolicyDto,
    AuthorizationPolicyEffect,
    PermissionAssignmentDto,
    PermissionDto,
    PermissionScope,
    RoleAssignmentDto,
    RoleDto,
} from "./dto";

import type {
    AccessApiCollection,
} from "./access-api-contracts";

// -----------------------------------------------------------------------------
// COLLECTION INPUT
// -----------------------------------------------------------------------------

export interface MapAccessApiCollectionInput<TSource> {
    readonly items:
    readonly TSource[];

    readonly limit?: number;

    readonly offset?: number;

    readonly total?: number;
}

// -----------------------------------------------------------------------------
// PERMISSION MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * PermissionResult currently exposes the canonical permission components but
 * does not expose lifecycle timestamps beyond createdAt.
 *
 * The API mapper therefore requires updatedAt and lifecycle information from
 * the caller rather than inventing those values.
 */
export interface MapPermissionDtoInput {
    readonly permission:
    PermissionResult;

    readonly scope:
    PermissionScope;

    readonly status:
    PermissionDto["status"];

    readonly updatedAt: string;

    readonly archivedAt?: string;
}

// -----------------------------------------------------------------------------
// ROLE MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * RoleResult exposes the complete public Role projection, including the
 * stable business key preserved by canonical Role state.
 */
export interface MapRoleDtoInput {
    readonly role:
    RoleResult;
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * Canonical role assignments currently target Memberships.
 *
 * Identity information may be supplied when the known Membership fact has
 * already been resolved by the application layer.
 */
export interface MapRoleAssignmentDtoInput {
    readonly assignment:
    RoleAssignmentResult;

    readonly identityId?: string;

    readonly lifecycleReason?: string;
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT MAPPING INPUT
// -----------------------------------------------------------------------------

export interface MapPermissionAssignmentDtoInput {
    readonly assignment:
    PermissionAssignmentResult;

    readonly identityId?: string;

    readonly lifecycleReason?: string;
}

// -----------------------------------------------------------------------------
// POLICY MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * AccessPolicyResult preserves canonical opaque evaluationRules.
 *
 * Public policy DTO fields must be supplied after those rules have been
 * interpreted by an Access-owned policy representation boundary.
 */
export interface MapAuthorizationPolicyDtoInput {
    readonly policy:
    AccessPolicyResult;

    readonly key: string;

    readonly description?: string;

    readonly permissionKeys:
    readonly string[];

    readonly resourceTypes:
    readonly string[];

    readonly effect:
    AuthorizationPolicyEffect;

    readonly priority: number;

    readonly conditions:
    readonly AuthorizationPolicyConditionDto[];
}

// -----------------------------------------------------------------------------
// RESTRICTION MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * AccessRestrictionResult exposes its canonical target as a domain structure.
 *
 * The transport-facing subject and affected permission/resource collections
 * must be normalized explicitly before mapping.
 */
export interface MapAccessRestrictionDtoInput {
    readonly restriction:
    AccessRestrictionResult;

    readonly subjectType:
    AccessRestrictionSubjectType;

    readonly subjectId: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly scope:
    AccessRestrictionScope;

    readonly permissionKeys:
    readonly string[];

    readonly resourceTypes:
    readonly string[];

    readonly reasonCode: string;

    readonly description?: string;

    readonly archivedAt?: string;
}

// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION MAPPING INPUT
// -----------------------------------------------------------------------------

/**
 * AccessAuthorizationResult deliberately exposes only the canonical decision
 * and evidence produced by the evaluator.
 *
 * The public DTO requires additional request and resolution data. That data
 * must be provided explicitly by the authorization use case.
 */
export interface MapAuthorizationDecisionDtoInput {
    readonly authorization:
    AccessAuthorizationResult;

    readonly decisionId: string;

    readonly actorId: string;

    readonly action: string;

    readonly effectivePermissions:
    readonly string[];

    readonly contributingRoleIds:
    readonly string[];

    readonly contributingPermissionAssignmentIds:
    readonly string[];

    readonly evaluatedPolicyIds:
    readonly string[];

    readonly appliedRestrictionIds:
    readonly string[];
}

// -----------------------------------------------------------------------------
// PERMISSION KEY
// -----------------------------------------------------------------------------

/**
 * Produces the canonical transport permission key from its owned components.
 *
 * Example:
 *
 *     membership.membership.read
 *
 * The service component is retained to prevent collisions between independently
 * owned business capabilities.
 */
export function createPermissionDtoKey(
    permission: PermissionResult,
): string {
    return [
        permission.service,
        permission.resource,
        permission.action,
    ].join(".");
}

// -----------------------------------------------------------------------------
// PERMISSION MAPPER
// -----------------------------------------------------------------------------

export function toPermissionDto(
    input: MapPermissionDtoInput,
): PermissionDto {
    return {
        permissionId:
            input.permission.permissionId,

        key:
            createPermissionDtoKey(
                input.permission,
            ),

        name:
            input.permission.displayName,

        description:
            input.permission.description,

        scope:
            input.scope,

        status:
            input.status,

        createdAt:
            input.permission.createdAt,

        updatedAt:
            input.updatedAt,

        archivedAt:
            input.archivedAt,
    };
}

// -----------------------------------------------------------------------------
// ROLE MAPPER
// -----------------------------------------------------------------------------

export function toRoleDto(
    input: MapRoleDtoInput,
): RoleDto {
    return {
        roleId:
            input.role.roleId,

        key:
            input.role.key,

        name:
            input.role.name,

        description:
            input.role.description,

        type:
            input.role.roleType,

        tenantId:
            input.role.tenantId,

        permissionIds: [
            ...input.role.permissionIds,
        ],

        status:
            input.role.lifecycleStatus,

        createdAt:
            input.role.createdAt,

        updatedAt:
            input.role.updatedAt,

        archivedAt:
            input.role.archivedAt,

        restoredAt:
            input.role.restoredAt,
    };
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENT MAPPER
// -----------------------------------------------------------------------------

export function toRoleAssignmentDto(
    input: MapRoleAssignmentDtoInput,
): RoleAssignmentDto {
    const assignment =
        input.assignment;

    return {
        assignmentId:
            assignment.assignmentId,

        roleId:
            assignment.roleId,

        subjectType:
            "membership",

        subjectId:
            assignment.membershipId,

        identityId:
            input.identityId,

        membershipId:
            assignment.membershipId,

        tenantId:
            assignment.tenantId,

        status:
            assignment.status,

        expiresAt:
            assignment.expiresAt,

        assignedBy:
            assignment.assignedBy,

        assignedAt:
            assignment.effectiveFrom,

        updatedAt:
            assignment.updatedAt,

        suspendedAt:
            assignment.suspendedAt,

        reactivatedAt:
            assignment.reactivatedAt,

        removedAt:
            assignment.removedAt,

        expiredAt:
            assignment.expiredAt,

        archivedAt:
            assignment.archivedAt,

        lifecycleReason:
            input.lifecycleReason,
    };
}

// -----------------------------------------------------------------------------
// PERMISSION ASSIGNMENT MAPPER
// -----------------------------------------------------------------------------

export function toPermissionAssignmentDto(
    input: MapPermissionAssignmentDtoInput,
): PermissionAssignmentDto {
    const assignment =
        input.assignment;

    return {
        assignmentId:
            assignment.assignmentId,

        permissionId:
            assignment.permissionId,

        subjectType:
            "membership",

        subjectId:
            assignment.membershipId,

        identityId:
            input.identityId,

        membershipId:
            assignment.membershipId,

        tenantId:
            assignment.tenantId,

        effect:
            assignment.assignmentType,

        status:
            assignment.status,

        expiresAt:
            assignment.expiresAt,

        assignedBy:
            assignment.assignedBy,

        assignedAt:
            assignment.effectiveFrom,

        updatedAt:
            assignment.updatedAt,

        suspendedAt:
            assignment.suspendedAt,

        reactivatedAt:
            assignment.reactivatedAt,

        revokedAt:
            assignment.revokedAt,

        expiredAt:
            assignment.expiredAt,

        archivedAt:
            assignment.archivedAt,

        lifecycleReason:
            input.lifecycleReason,
    };
}

// -----------------------------------------------------------------------------
// ACCESS ASSIGNMENT MAPPER
// -----------------------------------------------------------------------------

export type MapAccessAssignmentDtoInput =
    | {
        readonly assignment:
        RoleAssignmentResult;

        readonly identityId?: string;

        readonly lifecycleReason?: string;
    }
    | {
        readonly assignment:
        PermissionAssignmentResult;

        readonly identityId?: string;

        readonly lifecycleReason?: string;
    };

export function toAccessAssignmentDto(
    input: MapAccessAssignmentDtoInput,
): RoleAssignmentDto | PermissionAssignmentDto {
    if (
        isRoleAssignmentResult(
            input.assignment,
        )
    ) {
        return toRoleAssignmentDto({
            assignment:
                input.assignment,

            identityId:
                input.identityId,

            lifecycleReason:
                input.lifecycleReason,
        });
    }

    return toPermissionAssignmentDto({
        assignment:
            input.assignment,

        identityId:
            input.identityId,

        lifecycleReason:
            input.lifecycleReason,
    });
}

// -----------------------------------------------------------------------------
// AUTHORIZATION POLICY MAPPER
// -----------------------------------------------------------------------------

export function toAuthorizationPolicyDto(
    input: MapAuthorizationPolicyDtoInput,
): AuthorizationPolicyDto {
    return {
        policyId:
            input.policy.policyId,

        key:
            input.key,

        name:
            input.policy.name,

        description:
            input.description,

        scope:
            input.policy.scope,

        tenantId:
            input.policy.tenantId,

        permissionKeys: [
            ...input.permissionKeys,
        ],

        resourceTypes: [
            ...input.resourceTypes,
        ],

        effect:
            input.effect,

        priority:
            input.priority,

        conditions:
            input.conditions.map(
                (
                    condition,
                ) => ({
                    field:
                        condition.field,

                    operator:
                        condition.operator,

                    value:
                        condition.value,
                }),
            ),

        status:
            normalizePolicyStatus(
                input.policy.lifecycleStatus,
            ),

        createdAt:
            input.policy.createdAt,

        updatedAt:
            input.policy.updatedAt,

        archivedAt:
            input.policy.archivedAt,
    };
}

// -----------------------------------------------------------------------------
// ACCESS RESTRICTION MAPPER
// -----------------------------------------------------------------------------

export function toAccessRestrictionDto(
    input: MapAccessRestrictionDtoInput,
): AccessRestrictionDto {
    return {
        restrictionId:
            input.restriction.restrictionId,

        subjectType:
            input.subjectType,

        subjectId:
            input.subjectId,

        identityId:
            input.identityId,

        membershipId:
            input.membershipId,

        tenantId:
            input.restriction.tenantId,

        scope:
            input.scope,

        permissionKeys: [
            ...input.permissionKeys,
        ],

        resourceTypes: [
            ...input.resourceTypes,
        ],

        reasonCode:
            input.reasonCode,

        description:
            input.description,

        status:
            input.restriction.status,

        createdBy:
            input.restriction.createdBy,

        createdAt:
            input.restriction.createdAt,

        updatedAt:
            input.restriction.updatedAt,

        expiresAt:
            input.restriction.expiresAt,

        removedAt:
            input.restriction.removedAt,

        expiredAt:
            input.restriction.expiredAt,

        archivedAt:
            input.archivedAt,
    };
}

// -----------------------------------------------------------------------------
// AUTHORIZATION DECISION MAPPER
// -----------------------------------------------------------------------------

export function toAuthorizationDecisionDto(
    input: MapAuthorizationDecisionDtoInput,
): AuthorizationDecisionDto {
    return {
        decisionId:
            input.decisionId,

        allowed:
            input.authorization.decision === "allow",

        reasonCode:
            input.authorization.reasonCode,

        actorId:
            input.actorId,

        membershipId:
            input.authorization.membershipId,

        tenantId:
            input.authorization.tenantId,

        action:
            input.action,

        resource: {
            type:
                input.authorization.resourceType
                ?? "unspecified",

            id:
                input.authorization.resourceId,
        },

        effectivePermissions: [
            ...input.effectivePermissions,
        ],

        contributingRoleIds: [
            ...input.contributingRoleIds,
        ],

        contributingPermissionAssignmentIds: [
            ...input.contributingPermissionAssignmentIds,
        ],

        evaluatedPolicyIds: [
            ...input.evaluatedPolicyIds,
        ],

        appliedRestrictionIds: [
            ...input.appliedRestrictionIds,
        ],

        decidedAt:
            input.authorization.evaluatedAt,
    };
}

// -----------------------------------------------------------------------------
// COLLECTION MAPPERS
// -----------------------------------------------------------------------------

export function toPermissionCollectionDto(
    input: MapAccessApiCollectionInput<MapPermissionDtoInput>,
): AccessApiCollection<PermissionDto> {
    const items =
        input.items.map(
            toPermissionDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

export function toRoleCollectionDto(
    input: MapAccessApiCollectionInput<MapRoleDtoInput>,
): AccessApiCollection<RoleDto> {
    const items =
        input.items.map(
            toRoleDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

export function toRoleAssignmentCollectionDto(
    input:
        MapAccessApiCollectionInput<MapRoleAssignmentDtoInput>,
): AccessApiCollection<RoleAssignmentDto> {
    const items =
        input.items.map(
            toRoleAssignmentDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

export function toPermissionAssignmentCollectionDto(
    input:
        MapAccessApiCollectionInput<MapPermissionAssignmentDtoInput>,
): AccessApiCollection<PermissionAssignmentDto> {
    const items =
        input.items.map(
            toPermissionAssignmentDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

export function toAuthorizationPolicyCollectionDto(
    input:
        MapAccessApiCollectionInput<MapAuthorizationPolicyDtoInput>,
): AccessApiCollection<AuthorizationPolicyDto> {
    const items =
        input.items.map(
            toAuthorizationPolicyDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

export function toAccessRestrictionCollectionDto(
    input:
        MapAccessApiCollectionInput<MapAccessRestrictionDtoInput>,
): AccessApiCollection<AccessRestrictionDto> {
    const items =
        input.items.map(
            toAccessRestrictionDto,
        );

    return createAccessApiCollection({
        items,

        limit:
            input.limit,

        offset:
            input.offset,

        total:
            input.total,
    });
}

// -----------------------------------------------------------------------------
// COLLECTION FACTORY
// -----------------------------------------------------------------------------

function createAccessApiCollection<T>(
    input: {
        readonly items:
        readonly T[];

        readonly limit?: number;

        readonly offset?: number;

        readonly total?: number;
    },
): AccessApiCollection<T> {
    return {
        items:
            input.items,

        limit:
            input.limit,

        offset:
            input.offset,

        count:
            input.items.length,

        total:
            input.total,
    };
}

// -----------------------------------------------------------------------------
// RESULT GUARDS
// -----------------------------------------------------------------------------

function isRoleAssignmentResult(
    assignment:
        AccessAssignmentResult,
): assignment is RoleAssignmentResult {
    return (
        "roleId"
        in assignment
    );
}

// -----------------------------------------------------------------------------
// POLICY STATUS NORMALIZATION
// -----------------------------------------------------------------------------

function normalizePolicyStatus(
    status:
        AccessPolicyResult["lifecycleStatus"],
): AuthorizationPolicyDto["status"] {
    if (status === "archived") {
        return "archived";
    }

    return "active";
}