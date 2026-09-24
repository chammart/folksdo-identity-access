// services/identity/src/usecases/get-identity-for-provider-usecase.ts
import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization, type IdentityPlatformAuthorizationScope } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentityUserState } from "../state";

export interface GetIdentityForProviderRequest { readonly userId: string; }
export interface IdentityProviderReadSecurity { readonly scope: IdentityPlatformAuthorizationScope; }

export interface GetIdentityForProviderUseCase {
    execute(request: GetIdentityForProviderRequest, context: RuntimeContext, security: IdentityProviderReadSecurity): Promise<IdentityUserState>;
}

export function createGetIdentityForProviderUseCase(input: { readonly readStore: IdentityReadStore; readonly authorization: IdentityAuthorization; }): GetIdentityForProviderUseCase {
    return {
        async execute(request, context, security) {
            await input.authorization.authorize({
                permission: identityPermissions.view,
                scope: security.scope,
                resource: { type: "identity", id: request.userId },
            }, context);
            const user = await input.readStore.findUserById(request.userId);
            if (user === null) throw new IdentityUserNotFoundError(request.userId);
            return user;
        },
    };
}
