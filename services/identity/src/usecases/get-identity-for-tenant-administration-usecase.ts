import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization, type IdentityTenantAuthorizationScope } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { IdentityUserState } from "../state";

export interface IdentityTenantAdministrationSecurity {
    readonly scope: IdentityTenantAuthorizationScope;
}

export interface GetIdentityForTenantAdministrationUseCase {
    execute(
        request: { readonly userId: string },
        context: RuntimeContext,
        security: IdentityTenantAdministrationSecurity,
    ): Promise<IdentityUserState>;
}

export function createGetIdentityForTenantAdministrationUseCase(input: {
    readonly readStore: IdentityReadStore;
    readonly authorization: IdentityAuthorization;
}): GetIdentityForTenantAdministrationUseCase {
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
