// services/identity/src/usecases/list-identities-for-provider-usecase.ts
import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization } from "../authorization";
import type { IdentityReadStore, ListUsersResult } from "../read-store";
import type { IdentityUserStatus } from "../state";
import type { IdentityProviderReadSecurity } from "./get-identity-for-provider-usecase";

export interface ListIdentitiesForProviderRequest {
    readonly status?: IdentityUserStatus;
    readonly offset: number;
    readonly limit: number;
}

export interface ListIdentitiesForProviderUseCase {
    execute(request: ListIdentitiesForProviderRequest, context: RuntimeContext, security: IdentityProviderReadSecurity): Promise<ListUsersResult>;
}

export function createListIdentitiesForProviderUseCase(input: { readonly readStore: IdentityReadStore; readonly authorization: IdentityAuthorization; }): ListIdentitiesForProviderUseCase {
    return {
        async execute(request, context, security) {
            await input.authorization.authorize({
                permission: identityPermissions.list,
                scope: security.scope,
                resource: { type: "identity" },
            }, context);
            return await input.readStore.listUsers(request);
        },
    };
}
