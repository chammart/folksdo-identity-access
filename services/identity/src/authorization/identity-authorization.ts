// services/identity/src/authorization/identity-authorization.ts
import type { RuntimeContext } from "@folksdo-engine/runtime";
import { IdentityAuthorizationDeniedError, IdentityAuthorizationUnavailableError } from "../errors";
import type { IdentityAccessAuthorizationRequest, IdentityAccessAuthorizer } from "./identity-access-authorizer";

export interface IdentityAuthorization {
    authorize(request: IdentityAccessAuthorizationRequest, context: RuntimeContext): Promise<void>;
}

export function createIdentityAuthorization(authorizer: IdentityAccessAuthorizer): IdentityAuthorization {
    return {
        async authorize(request, context): Promise<void> {
            let decision;
            try {
                decision = await authorizer.authorize(request, context);
            } catch (error) {
                if (error instanceof IdentityAuthorizationDeniedError) throw error;
                throw new IdentityAuthorizationUnavailableError(error);
            }
            if (!decision.allowed) {
                throw new IdentityAuthorizationDeniedError(decision.reasonCode, decision.decisionId);
            }
        },
    };
}
