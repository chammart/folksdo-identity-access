// services/identity/src/usecases/get-identity-security-summary-usecase.ts
// -----------------------------------------------------------------------------
// GET IDENTITY SECURITY SUMMARY
// -----------------------------------------------------------------------------
// Identity-owned administration read. Exposes only safe lifecycle/session
// summary facts; never provider session identifiers, tokens or credentials.
// -----------------------------------------------------------------------------

import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization, type IdentityAuthorizationScope } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityAdministrationSessionReadStore, IdentityReadStore } from "../read-store";

export interface IdentitySecuritySummarySecurity {
    readonly scope: IdentityAuthorizationScope;
}

export interface IdentitySecuritySummary {
    readonly userId: string;
    readonly identityStatus: "pending_email_verification" | "active" | "suspended" | "disabled";
    readonly emailVerified: boolean;
    readonly sessions: {
        readonly total: number;
        readonly active: number;
        readonly signedOut: number;
        readonly revoked: number;
        readonly expired: number;
        readonly lastIssuedAt?: string;
        readonly nearestActiveExpiryAt?: string;
    };
}

export interface GetIdentitySecuritySummaryUseCase {
    execute(userId: string, context: RuntimeContext, security: IdentitySecuritySummarySecurity): Promise<IdentitySecuritySummary>;
}

export function createGetIdentitySecuritySummaryUseCase(input: {
    readonly readStore: IdentityReadStore & IdentityAdministrationSessionReadStore;
    readonly authorization: IdentityAuthorization;
}): GetIdentitySecuritySummaryUseCase {
    return {
        async execute(userId, context, security) {
            await input.authorization.authorize({
                permission: identityPermissions.view,
                scope: security.scope,
                resource: { type: "identity", id: userId },
            }, context);
            const [user, sessions] = await Promise.all([
                input.readStore.findUserById(userId),
                input.readStore.listSessionsByUserId(userId),
            ]);
            if (user === null) throw new IdentityUserNotFoundError(userId);
            const active = sessions.filter(session => session.status === "active");
            const issued = sessions.map(session => session.issuedAt).sort();
            const activeExpiries = active.map(session => session.expiresAt).sort();
            return {
                userId,
                identityStatus: user.status,
                emailVerified: user.emailVerified,
                sessions: {
                    total: sessions.length,
                    active: active.length,
                    signedOut: sessions.filter(session => session.status === "signed_out").length,
                    revoked: sessions.filter(session => session.status === "revoked").length,
                    expired: sessions.filter(session => session.status === "expired").length,
                    ...(issued.length > 0 ? { lastIssuedAt: issued[issued.length - 1] } : {}),
                    ...(activeExpiries.length > 0 ? { nearestActiveExpiryAt: activeExpiries[0] } : {}),
                },
            };
        },
    };
}
