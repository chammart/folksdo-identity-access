// services/identity/src/usecases/provider-recovery-initiation-usecase.ts
// -----------------------------------------------------------------------------
// PROVIDER RECOVERY INITIATION
// -----------------------------------------------------------------------------
// Provider Admin may initiate the existing Identity recovery lifecycle but may
// never select, inspect, or directly mutate credentials or recovery tokens.
// -----------------------------------------------------------------------------
import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { ProviderRecoveryInitiationResult } from "../api";
import { identityPermissions, type IdentityAuthorization, type IdentityPlatformAuthorizationScope } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityReadStore } from "../read-store";
import type { RequestPasswordResetUseCase } from "./request-password-reset-usecase";

export interface ProviderRecoverySecurity { readonly scope: IdentityPlatformAuthorizationScope; }
export interface ProviderRecoveryInitiationUseCase { execute(userId: string, context: RuntimeContext, security: ProviderRecoverySecurity): Promise<ProviderRecoveryInitiationResult>; }
export function createProviderRecoveryInitiationUseCase(input: { readonly readStore: IdentityReadStore; readonly authorization: IdentityAuthorization; readonly requestPasswordReset: RequestPasswordResetUseCase; }): ProviderRecoveryInitiationUseCase {
    return { async execute(userId, context, security) {
        await input.authorization.authorize({ permission: identityPermissions.recoveryInitiate, scope: security.scope, resource: { type: "recovery", id: userId } }, context);
        const user = await input.readStore.findUserById(userId);
        if (user === null) throw new IdentityUserNotFoundError(userId);
        await input.requestPasswordReset.execute({ email: user.email }, context);
        return { userId, recoveryInitiated: true };
    }};
}
