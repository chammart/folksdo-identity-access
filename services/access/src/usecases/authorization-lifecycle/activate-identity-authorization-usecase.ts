// services/access/src/usecases/authorization-lifecycle/activate-identity-authorization-usecase.ts
import { activateKnownIdentity } from "../../business-rules";
import type { AccessUseCaseDependencies } from "../shared";
import { commitLifecycle, knownFactChange } from "./lifecycle-support";

export interface ActivateIdentityAuthorizationUseCaseRequest {
    readonly identityId: string;
    readonly sourceReference?: string;
}

export class ActivateIdentityAuthorizationUseCase {
    public constructor(private readonly dependencies: AccessUseCaseDependencies) { }

    public async execute(request: ActivateIdentityAuthorizationUseCaseRequest) {
        const now = this.dependencies.clock.now();
        const current = await this.dependencies.readStore.findKnownIdentity(request.identityId);
        const next = activateKnownIdentity(current, request.identityId, now);
        const change = knownFactChange(this.dependencies.collections.knownIdentities, request.identityId, current, next);
        const changed = await commitLifecycle({
            dependencies: this.dependencies,
            aggregateType: "access.identity-authorization",
            aggregateId: request.identityId,
            eventType: "access.identity.authorization.activated",
            subject: this.dependencies.outboxSubjects.identityAccessActivated,
            now,
            payload: { identityId: request.identityId, status: "active", occurredAt: now, sourceReference: request.sourceReference },
            stateChanges: change ? [change] : [],
        });
        return { identityId: request.identityId, status: "active" as const, changed };
    }
}
