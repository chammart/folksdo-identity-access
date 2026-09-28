// services/access/src/usecases/queries/get-effective-access-usecase.ts
// -----------------------------------------------------------------------------
// GET EFFECTIVE ACCESS USE CASE
// -----------------------------------------------------------------------------
// Administration-grade read of the effective Access facts for one Membership.
//
// Boundary:
//   • consumes canonical Access-owned state and Access-known Membership facts
//   • reuses the same effective Permission resolver used by authorization
//   • includes applicable active Restrictions without producing a final decision
//   • excludes inactive, future, expired, removed, or suspended assignments
//   • performs no state mutation, event emission, or outbox publication
// -----------------------------------------------------------------------------

import { resolveEffectivePermission } from "../../authorization";
import { AuthorizationContextInvalidError } from "../../errors";
import type { AccessRestrictionState, PermissionAssignmentState, RoleAssignmentState } from "../../state";
import { toAccessRestrictionResult, toPermissionResult, type AccessRestrictionResult, type AccessUseCaseDependencies, type EffectivePermissionResult } from "../shared";

export interface GetEffectiveAccessRequest {
    readonly membershipId: string;
    readonly tenantId: string;
}

export interface EffectiveAccessResult {
    readonly identityId: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly membershipIsValid: boolean;
    readonly effectivePermissions: readonly EffectivePermissionResult[];
    readonly restrictions: readonly AccessRestrictionResult[];
    readonly evaluatedAt: string;
}

export class GetEffectiveAccessUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) {}

    public async execute(request: GetEffectiveAccessRequest): Promise<EffectiveAccessResult> {
        const now = this.dependencies.clock.now();
        const membership = await this.dependencies.knownFactsStore.findMembership(request.membershipId);
        if (membership === null || membership.tenantId !== request.tenantId) throw new AuthorizationContextInvalidError();

        if (membership.status !== "active") return emptyResult(membership.identityId, request, now);

        const [identityAvailable, tenantAvailable, permissions, roleAssignments, permissionAssignments, restrictions] = await Promise.all([
            this.dependencies.knownFactsStore.identityIsAvailable(membership.identityId),
            this.dependencies.knownFactsStore.tenantIsAvailable(request.tenantId),
            this.dependencies.readStore.listPermissions(),
            this.dependencies.readStore.listRoleAssignmentsByMembership(request.membershipId, request.tenantId),
            this.dependencies.readStore.listPermissionAssignmentsByMembership(request.membershipId, request.tenantId),
            this.dependencies.readStore.listRestrictions(request.tenantId),
        ]);

        if (!identityAvailable || !tenantAvailable) return emptyResult(membership.identityId, request, now);

        const effectiveRoleAssignments = roleAssignments.filter(a => roleAssignmentIsEffective(a, now));
        const effectivePermissionAssignments = permissionAssignments.filter(a => permissionAssignmentIsEffective(a, now));
        const roleIds = [...new Set(effectiveRoleAssignments.map(a => a.roleId))];
        const [roles, bindings] = roleIds.length === 0 ? [[], []] as const : await Promise.all([
            Promise.all(roleIds.map(id => this.dependencies.readStore.findRoleById(id))).then(xs => xs.filter((x): x is NonNullable<typeof x> => x !== null)),
            this.dependencies.readStore.listRolePermissionBindings(roleIds),
        ]);

        const effectivePermissions: EffectivePermissionResult[] = [];
        for (const permission of permissions) {
            const resolution = resolveEffectivePermission({
                request: { subject: { membershipId: request.membershipId, tenantId: request.tenantId }, now },
                permission, roles, roleAssignments: effectiveRoleAssignments, permissionAssignments: effectivePermissionAssignments, rolePermissionBindings: bindings,
            });
            for (const candidate of resolution.candidates) {
                if (candidate.sourceId === undefined) continue;
                const source = findSource(candidate.sourceId, effectiveRoleAssignments, effectivePermissionAssignments);
                if (source === undefined) continue;
                effectivePermissions.push({
                    permission: toPermissionResult(permission),
                    effect: candidate.effect,
                    source: candidate.source === "role_grant" ? "role_assignment" : "permission_assignment",
                    sourceId: candidate.sourceId,
                    effectiveFrom: source.effectiveFrom,
                    ...(source.expiresAt === undefined ? {} : { expiresAt: source.expiresAt }),
                });
            }
        }

        const applicableRestrictions = restrictions
            .filter(x => restrictionIsEffective(x, now))
            .filter(x => restrictionApplies(x, request.membershipId, request.tenantId, roleIds))
            .map(toAccessRestrictionResult);

        return {
            identityId: membership.identityId, membershipId: request.membershipId, tenantId: request.tenantId, membershipIsValid: true,
            effectivePermissions: effectivePermissions.sort((a,b) => a.permission.permissionId.localeCompare(b.permission.permissionId) || a.sourceId.localeCompare(b.sourceId)),
            restrictions: applicableRestrictions.sort((a,b) => a.restrictionId.localeCompare(b.restrictionId)), evaluatedAt: now,
        };
    }
}

function emptyResult(identityId: string, request: GetEffectiveAccessRequest, now: string): EffectiveAccessResult {
    return { identityId, membershipId: request.membershipId, tenantId: request.tenantId, membershipIsValid: false, effectivePermissions: [], restrictions: [], evaluatedAt: now };
}
function roleAssignmentIsEffective(a: RoleAssignmentState, now: string): boolean { return a.status === "active" && a.suspensionSources.length === 0 && a.effectiveFrom <= now && (a.expiresAt === undefined || a.expiresAt > now); }
function permissionAssignmentIsEffective(a: PermissionAssignmentState, now: string): boolean { return a.status === "active" && a.suspensionSources.length === 0 && a.effectiveFrom <= now && (a.expiresAt === undefined || a.expiresAt > now); }
function findSource(id: string, roles: readonly RoleAssignmentState[], permissions: readonly PermissionAssignmentState[]): RoleAssignmentState | PermissionAssignmentState | undefined { return roles.find(x => x.assignmentId === id) ?? permissions.find(x => x.assignmentId === id); }
function restrictionIsEffective(r: AccessRestrictionState, now: string): boolean { return r.status === "active" && r.effectiveFrom <= now && (r.expiresAt === undefined || r.expiresAt > now); }
function restrictionApplies(r: AccessRestrictionState, membershipId: string, tenantId: string, roleIds: readonly string[]): boolean {
    if (r.tenantId !== undefined && r.tenantId !== tenantId) return false;
    switch (r.target.targetType) {
        case "membership": return r.target.membershipId === membershipId;
        case "tenant": return r.target.tenantId === tenantId;
        case "role": return roleIds.includes(r.target.roleId);
        case "permission": return true;
        case "resource_type": return true;
        case "resource_instance": return true;
    }
}
