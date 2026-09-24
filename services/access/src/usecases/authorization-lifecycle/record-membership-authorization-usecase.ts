// services/access/src/usecases/authorization-lifecycle/record-membership-authorization-usecase.ts
import { recordKnownMembership } from "../../business-rules";
import type { AccessUseCaseDependencies } from "../shared";
import { commitLifecycle, knownFactChange } from "./lifecycle-support";

export interface RecordMembershipAuthorizationUseCaseRequest {
    readonly membershipId: string;
    readonly identityId: string;
    readonly tenantId: string;
    readonly sourceReference?: string;
}

export class RecordMembershipAuthorizationUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) { }

    public async execute(request: RecordMembershipAuthorizationUseCaseRequest) {
        const now = this.dependencies.clock.now();
        const current = await this.dependencies.readStore.findKnownMembership(request.membershipId);
        const next = recordKnownMembership(current, {
            membershipId: request.membershipId,
            identityId: request.identityId,
            tenantId: request.tenantId,
            membershipType: "member",
        }, now);
        const change = knownFactChange(this.dependencies.collections.knownMemberships, request.membershipId, current, next);
        const changed = await commitLifecycle({
            dependencies: this.dependencies,
            aggregateType: "access.membership-authorization",
            aggregateId: request.membershipId,
            eventType: "access.membership.authorization.recorded",
            subject: this.dependencies.outboxSubjects.membershipAuthorizationRecorded,
            now,
            payload: { membershipId: request.membershipId, identityId: request.identityId, tenantId: request.tenantId, status: "pending", occurredAt: now, sourceReference: request.sourceReference },
            stateChanges: change ? [change] : [],
        });
        return { membershipId: request.membershipId, status: "pending" as const, changed };
    }
}
