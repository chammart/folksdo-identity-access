// services/identity/src/usecases/get-identity-security-history-usecase.ts
// -----------------------------------------------------------------------------
// GET IDENTITY SECURITY HISTORY
// -----------------------------------------------------------------------------
// Provider-safe investigation over canonical Identity Engine events. Raw event
// payloads are deliberately not exposed.
// -----------------------------------------------------------------------------
import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization, type IdentityAuthorizationScope } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityReadStore, IdentitySecurityHistoryReadStore, IdentitySecurityHistoryEvent } from "../read-store";

export interface IdentitySecurityHistorySecurity { readonly scope: IdentityAuthorizationScope; }
export interface IdentitySecurityHistory { readonly userId: string; readonly events: readonly IdentitySecurityHistoryEvent[]; }
export interface GetIdentitySecurityHistoryUseCase { execute(userId: string, context: RuntimeContext, security: IdentitySecurityHistorySecurity): Promise<IdentitySecurityHistory>; }
export function createGetIdentitySecurityHistoryUseCase(input: { readonly readStore: IdentityReadStore & IdentitySecurityHistoryReadStore; readonly authorization: IdentityAuthorization; }): GetIdentitySecurityHistoryUseCase {
    return { async execute(userId, context, security) {
        await input.authorization.authorize({ permission: identityPermissions.securityHistoryView, scope: security.scope, resource: { type: "identity", id: userId } }, context);
        const user = await input.readStore.findUserById(userId);
        if (user === null) throw new IdentityUserNotFoundError(userId);
        return { userId, events: await input.readStore.listSecurityEventsByUserId(userId) };
    }};
}
