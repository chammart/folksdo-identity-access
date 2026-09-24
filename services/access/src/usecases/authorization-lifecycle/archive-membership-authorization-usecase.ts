// services/access/src/usecases/authorization-lifecycle/archive-membership-authorization-usecase.ts
// -----------------------------------------------------------------------------
// ARCHIVE MEMBERSHIP AUTHORIZATION USE CASE
// -----------------------------------------------------------------------------
import { archiveKnownMembership, archiveAssignmentForMembership } from "../../business-rules";
import type { KnownMembershipType } from "../../known-facts";
import type { AccessUseCaseDependencies, AccessStateChange } from "../shared";
import { assignmentChanges, commitLifecycle, knownFactChange, loadMembershipAssignments } from "./lifecycle-support";

export interface ArchiveMembershipAuthorizationUseCaseRequest { readonly membershipId: string; readonly identityId: string; readonly tenantId: string; readonly membershipType: KnownMembershipType; readonly reason?: string; readonly sourceReference?: string; }
export interface ArchiveMembershipAuthorizationUseCaseResult { readonly membershipId: string; readonly status: "archived"; readonly changed: boolean; readonly affectedAssignmentCount: number; }

export class ArchiveMembershipAuthorizationUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) {}
    public async execute(request: ArchiveMembershipAuthorizationUseCaseRequest): Promise<ArchiveMembershipAuthorizationUseCaseResult> {
        const now = this.dependencies.clock.now();
        const current = await this.dependencies.readStore.findKnownMembership(request.membershipId);
        const seed = { membershipId: request.membershipId, identityId: request.identityId, tenantId: request.tenantId, membershipType: request.membershipType };
        const next = archiveKnownMembership(current, seed, now);
        const loaded = await loadMembershipAssignments(this.dependencies, request.membershipId);
        const nextRoles = loaded.roles.map((assignment) => archiveAssignmentForMembership(assignment, now));
        const nextPermissions = loaded.permissions.map((assignment) => archiveAssignmentForMembership(assignment, now));
        const stateChanges: AccessStateChange[] = [];
        const factChange = knownFactChange(this.dependencies.collections.knownMemberships, request.membershipId, current, next);
        if (factChange) stateChanges.push(factChange);
        stateChanges.push(...assignmentChanges(this.dependencies, loaded.roles, nextRoles, loaded.permissions, nextPermissions));
        const payload = { membershipId: request.membershipId, identityId: request.identityId, tenantId: request.tenantId, status: "archived", occurredAt: now, reason: request.reason, sourceReference: request.sourceReference };
        const changed = await commitLifecycle({ dependencies: this.dependencies, aggregateType: "access.membership-authorization", aggregateId: request.membershipId, eventType: "access.membership_authorization.archived", subject: this.dependencies.outboxSubjects.membershipAuthorizationArchived, now, payload, stateChanges });
        return { membershipId: request.membershipId, status: "archived", changed, affectedAssignmentCount: Math.max(0, stateChanges.length - (factChange ? 1 : 0)) };
    }
}
