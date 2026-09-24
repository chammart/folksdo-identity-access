// services/access/src/usecases/queries/current-authorization-usecase.ts
// -----------------------------------------------------------------------------
// CURRENT AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
// Resolves the effective Access authorization state for one authenticated
// Identity operating through one Membership and Tenant context.
//
// Boundary:
//   • does not authenticate the Identity
//   • does not establish or switch Membership context
//   • validates the supplied context against Access-known Membership facts
//   • resolves active Role and direct Permission assignments
//   • applies direct Permission denial precedence
//   • excludes inactive, suspended, expired, archived, removed or revoked state
//   • returns provider-neutral effective Permission results
//   • performs no state mutation, event emission or outbox publication
// -----------------------------------------------------------------------------

import {
    AuthorizationContextInvalidError,
} from "../../errors";

import type {
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
} from "../../state";

import {
    toPermissionResult,
} from "../shared";

import type {
    AccessUseCaseDependencies,
    CurrentAccessResult,
    EffectivePermissionResult,
} from "../shared";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface CurrentAuthorizationRequest {
    /**
     * Authenticated global Identity supplied by the host execution context.
     */
    readonly identityId: string;

    /**
     * Membership selected by Membership Operations™ as the active tenant
     * execution context.
     */
    readonly membershipId: string;

    /**
     * Tenant associated with the selected Membership context.
     */
    readonly tenantId: string;
}

// -----------------------------------------------------------------------------
// INTERNAL EFFECTIVE PERMISSION CANDIDATE
// -----------------------------------------------------------------------------

interface EffectivePermissionCandidate {
    readonly permissionId: string;

    readonly effect:
    | "grant"
    | "deny";

    readonly source:
    | "role_assignment"
    | "permission_assignment";

    readonly sourceId: string;

    readonly effectiveFrom: string;

    readonly expiresAt?: string;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class CurrentAuthorizationUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: CurrentAuthorizationRequest,
    ): Promise<CurrentAccessResult> {
        const now =
            this.dependencies.clock.now();

        const membership =
            await this.dependencies.knownFactsStore
                .findMembership(
                    request.membershipId,
                );

        if (membership === null) {
            throw new AuthorizationContextInvalidError();
        }

        if (
            membership.identityId
            !== request.identityId
            || membership.tenantId
            !== request.tenantId
        ) {
            throw new AuthorizationContextInvalidError();
        }

        const membershipIsValid =
            membership.status === "active";

        if (!membershipIsValid) {
            return createInvalidCurrentAccessResult(
                request,
                now,
            );
        }

        const [
            identityIsAvailable,
            tenantIsAvailable,
            permissions,
            roleAssignments,
            permissionAssignments,
        ] =
            await Promise.all([
                this.dependencies.knownFactsStore
                    .identityIsAvailable(
                        request.identityId,
                    ),

                this.dependencies.knownFactsStore
                    .tenantIsAvailable(
                        request.tenantId,
                    ),

                this.dependencies.readStore
                    .listPermissions(),

                this.dependencies.readStore
                    .listRoleAssignmentsByMembership(
                        request.membershipId,
                        request.tenantId,
                    ),

                this.dependencies.readStore
                    .listPermissionAssignmentsByMembership(
                        request.membershipId,
                        request.tenantId,
                    ),
            ]);

        if (
            !identityIsAvailable
            || !tenantIsAvailable
        ) {
            return createInvalidCurrentAccessResult(
                request,
                now,
            );
        }

        const activeRoleAssignments =
            roleAssignments.filter(
                (assignment) =>
                    roleAssignmentIsEffective(
                        assignment,
                        now,
                    ),
            );

        const activePermissionAssignments =
            permissionAssignments.filter(
                (assignment) =>
                    permissionAssignmentIsEffective(
                        assignment,
                        now,
                    ),
            );

        const roleIds = [
            ...new Set(
                activeRoleAssignments.map(
                    (assignment) =>
                        assignment.roleId,
                ),
            ),
        ];

        const [
            roles,
            rolePermissionBindings,
        ] =
            roleIds.length > 0
                ? await Promise.all([
                    Promise.all(
                        roleIds.map(
                            roleId =>
                                this.dependencies.readStore
                                    .findRoleById(
                                        roleId,
                                    ),
                        ),
                    ).then(
                        resolvedRoles =>
                            resolvedRoles.filter(
                                role =>
                                    role !== null,
                            ),
                    ),

                    this.dependencies.readStore
                        .listRolePermissionBindings(
                            roleIds,
                        ),
                ])
                : [[], []] as const;

        const activeRoleIds =
            new Set(
                roles
                    .filter(
                        role =>
                            role.lifecycleStatus === "active",
                    )
                    .filter(
                        role =>
                            role.roleType !== "tenant"
                            || role.tenantId
                            === request.tenantId,
                    )
                    .map(
                        role =>
                            role.roleId,
                    ),
            );

        const activeRolePermissionBindings =
            rolePermissionBindings.filter(
                binding =>
                    activeRoleIds.has(
                        binding.roleId,
                    ),
            );

        const candidates =
            resolveEffectivePermissionCandidates({
                roleAssignments:
                    activeRoleAssignments,

                permissionAssignments:
                    activePermissionAssignments,

                rolePermissionBindings:
                    activeRolePermissionBindings,
            });

        const permissionsById =
            new Map(
                permissions.map(
                    (permission) => [
                        permission.permissionId,
                        permission,
                    ] as const,
                ),
            );

        const effectivePermissions =
            candidates
                .map(
                    (
                        candidate,
                    ): EffectivePermissionResult | null => {
                        const permission =
                            permissionsById.get(
                                candidate.permissionId,
                            );

                        if (permission === undefined) {
                            return null;
                        }

                        return {
                            permission:
                                toPermissionResult(
                                    permission,
                                ),

                            effect:
                                candidate.effect,

                            source:
                                candidate.source,

                            sourceId:
                                candidate.sourceId,

                            effectiveFrom:
                                candidate.effectiveFrom,

                            expiresAt:
                                candidate.expiresAt,
                        };
                    },
                )
                .filter(
                    (
                        result,
                    ): result is EffectivePermissionResult =>
                        result !== null,
                )
                .sort(
                    compareEffectivePermissions,
                );

        return {
            identityId:
                request.identityId,

            membershipId:
                request.membershipId,

            tenantId:
                request.tenantId,

            membershipIsValid:
                true,

            effectivePermissions,

            evaluatedAt:
                now,
        };
    }
}

// -----------------------------------------------------------------------------
// INVALID CURRENT ACCESS RESULT
// -----------------------------------------------------------------------------

function createInvalidCurrentAccessResult(
    request: CurrentAuthorizationRequest,
    evaluatedAt: string,
): CurrentAccessResult {
    return {
        identityId:
            request.identityId,

        membershipId:
            request.membershipId,

        tenantId:
            request.tenantId,

        membershipIsValid:
            false,

        effectivePermissions: [],

        evaluatedAt,
    };
}

// -----------------------------------------------------------------------------
// EFFECTIVE ROLE ASSIGNMENT
// -----------------------------------------------------------------------------

function roleAssignmentIsEffective(
    assignment: RoleAssignmentState,
    now: string,
): boolean {
    return (
        assignment.status === "active"
        && assignment.suspensionSources.length === 0
        && assignment.effectiveFrom <= now
        && (
            assignment.expiresAt === undefined
            || assignment.expiresAt > now
        )
    );
}

// -----------------------------------------------------------------------------
// EFFECTIVE PERMISSION ASSIGNMENT
// -----------------------------------------------------------------------------

function permissionAssignmentIsEffective(
    assignment: PermissionAssignmentState,
    now: string,
): boolean {
    return (
        assignment.status === "active"
        && assignment.suspensionSources.length === 0
        && assignment.effectiveFrom <= now
        && (
            assignment.expiresAt === undefined
            || assignment.expiresAt > now
        )
    );
}

// -----------------------------------------------------------------------------
// CANDIDATE RESOLUTION
// -----------------------------------------------------------------------------

function resolveEffectivePermissionCandidates(
    input: {
        readonly roleAssignments:
        readonly RoleAssignmentState[];

        readonly permissionAssignments:
        readonly PermissionAssignmentState[];

        readonly rolePermissionBindings:
        readonly {
            readonly roleId: string;

            readonly permissionId: string;
        }[];
    },
): readonly EffectivePermissionCandidate[] {
    const roleAssignmentsByRoleId =
        new Map<
            string,
            readonly RoleAssignmentState[]
        >();

    for (
        const assignment
        of input.roleAssignments
    ) {
        const existing =
            roleAssignmentsByRoleId.get(
                assignment.roleId,
            ) ?? [];

        roleAssignmentsByRoleId.set(
            assignment.roleId,
            [
                ...existing,
                assignment,
            ],
        );
    }

    const candidatesByPermissionId =
        new Map<
            string,
            EffectivePermissionCandidate[]
        >();

    for (
        const binding
        of input.rolePermissionBindings
    ) {
        const assignments =
            roleAssignmentsByRoleId.get(
                binding.roleId,
            ) ?? [];

        for (const assignment of assignments) {
            addCandidate(
                candidatesByPermissionId,
                {
                    permissionId:
                        binding.permissionId,

                    effect:
                        "grant",

                    source:
                        "role_assignment",

                    sourceId:
                        assignment.assignmentId,

                    effectiveFrom:
                        assignment.effectiveFrom,

                    expiresAt:
                        assignment.expiresAt,
                },
            );
        }
    }

    for (
        const assignment
        of input.permissionAssignments
    ) {
        addCandidate(
            candidatesByPermissionId,
            {
                permissionId:
                    assignment.permissionId,

                effect:
                    assignment.assignmentType,

                source:
                    "permission_assignment",

                sourceId:
                    assignment.assignmentId,

                effectiveFrom:
                    assignment.effectiveFrom,

                expiresAt:
                    assignment.expiresAt,
            },
        );
    }

    const effectiveCandidates:
        EffectivePermissionCandidate[] = [];

    for (
        const candidates
        of candidatesByPermissionId.values()
    ) {
        const directDenial =
            candidates.find(
                (candidate) =>
                    candidate.source
                    === "permission_assignment"
                    && candidate.effect
                    === "deny",
            );

        if (directDenial !== undefined) {
            effectiveCandidates.push(
                directDenial,
            );

            continue;
        }

        const directGrant =
            candidates.find(
                (candidate) =>
                    candidate.source
                    === "permission_assignment"
                    && candidate.effect
                    === "grant",
            );

        if (directGrant !== undefined) {
            effectiveCandidates.push(
                directGrant,
            );

            continue;
        }

        const roleGrant =
            candidates.find(
                (candidate) =>
                    candidate.source
                    === "role_assignment",
            );

        if (roleGrant !== undefined) {
            effectiveCandidates.push(
                roleGrant,
            );
        }
    }

    return effectiveCandidates;
}

// -----------------------------------------------------------------------------
// ADD CANDIDATE
// -----------------------------------------------------------------------------

function addCandidate(
    candidatesByPermissionId:
        Map<
            string,
            EffectivePermissionCandidate[]
        >,

    candidate:
        EffectivePermissionCandidate,
): void {
    const existing =
        candidatesByPermissionId.get(
            candidate.permissionId,
        ) ?? [];

    candidatesByPermissionId.set(
        candidate.permissionId,
        [
            ...existing,
            candidate,
        ],
    );
}

// -----------------------------------------------------------------------------
// DETERMINISTIC RESULT ORDER
// -----------------------------------------------------------------------------

function compareEffectivePermissions(
    left: EffectivePermissionResult,
    right: EffectivePermissionResult,
): number {
    const leftKey =
        createPermissionResultKey(
            left.permission,
        );

    const rightKey =
        createPermissionResultKey(
            right.permission,
        );

    return leftKey.localeCompare(
        rightKey,
    );
}

// -----------------------------------------------------------------------------
// PERMISSION RESULT KEY
// -----------------------------------------------------------------------------

function createPermissionResultKey(
    permission: PermissionState,
): string {
    return [
        permission.service,
        permission.resource,
        permission.action,
    ].join(".");
}