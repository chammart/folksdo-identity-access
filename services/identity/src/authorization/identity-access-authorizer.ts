// services/identity/src/authorization/identity-access-authorizer.ts
import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { IdentityPermission } from "./identity-permissions";

export interface IdentityPlatformAuthorizationScope {
    readonly type: "platform";
    readonly tenantId: string;
    readonly membershipId: string;
}

export interface IdentityTenantAuthorizationScope {
    readonly type: "tenant";
    readonly tenantId: string;
    readonly membershipId: string;
}

export type IdentityAuthorizationScope =
    | IdentityPlatformAuthorizationScope
    | IdentityTenantAuthorizationScope;

export interface IdentityAccessAuthorizationRequest {
    readonly permission: IdentityPermission;
    readonly scope: IdentityAuthorizationScope;
    readonly resource: { readonly type: "identity" | "session" | "recovery"; readonly id?: string; };
}

export interface IdentityAccessAuthorizationDecision {
    readonly allowed: boolean;
    readonly decisionId: string;
    readonly reasonCode: string;
}

export interface IdentityAccessAuthorizer {
    authorize(
        request: IdentityAccessAuthorizationRequest,
        context: RuntimeContext,
    ): Promise<IdentityAccessAuthorizationDecision>;
}
