// -----------------------------------------------------------------------------
// GET IDENTITY SECURITY SUMMARY
// -----------------------------------------------------------------------------
// Provider-safe Identity security projection. No provider session identifiers,
// credential references, password material, recovery tokens or secrets escape.
// -----------------------------------------------------------------------------
import type { RuntimeContext } from "@folksdo-engine/runtime";
import { identityPermissions, type IdentityAuthorization, type IdentityAuthorizationScope, type IdentityPermission } from "../authorization";
import { IdentityUserNotFoundError } from "../errors";
import type { IdentityAdministrationSessionReadStore, IdentityReadStore, IdentitySecuritySummaryReadStore } from "../read-store";
export interface IdentitySecuritySummarySecurity {
    readonly scope: IdentityAuthorizationScope;
    /** Trusted internal compatibility override for established administration compositions. */
    readonly authorizationPermission?: IdentityPermission;
}
export interface IdentitySecuritySummary {
    readonly userId: string;
    readonly identityStatus: "pending_email_verification" | "active" | "suspended" | "disabled";
    /** R1 compatibility field retained for existing IAM 360 / Person Detail consumers. */
    readonly emailVerified: boolean;
    readonly verification: { readonly emailVerified: boolean; readonly state: "verified" | "pending"; };
    readonly authentication: { readonly credentialActive: boolean; readonly signInEligible: boolean; };
    readonly recovery: { readonly state: "none" | "requested"; readonly lastRequestedAt?: string; };
    readonly sessions: { readonly total: number; readonly active: number; readonly signedOut: number; readonly revoked: number; readonly expired: number; readonly lastIssuedAt?: string; readonly nearestActiveExpiryAt?: string; };
    readonly indicators: { readonly suspended: boolean; readonly unverifiedEmail: boolean; readonly activeSessionsPresent: boolean; readonly recoveryInProgress: boolean; };
}
export interface GetIdentitySecuritySummaryUseCase { execute(userId: string, context: RuntimeContext, security: IdentitySecuritySummarySecurity): Promise<IdentitySecuritySummary>; }
export function createGetIdentitySecuritySummaryUseCase(input: { readonly readStore: IdentityReadStore & IdentityAdministrationSessionReadStore & IdentitySecuritySummaryReadStore; readonly authorization: IdentityAuthorization; }): GetIdentitySecuritySummaryUseCase {
    return { async execute(userId, context, security) {
        await input.authorization.authorize({ permission: security.authorizationPermission ?? identityPermissions.securitySummaryView, scope: security.scope, resource: { type: "identity", id: userId } }, context);
        const [user, sessions, passwordCredential, recovery] = await Promise.all([input.readStore.findUserById(userId), input.readStore.listSessionsByUserId(userId), input.readStore.findActivePasswordCredentialByUserId(userId), input.readStore.findLatestPasswordResetRequestByUserId(userId)]);
        if (user === null) throw new IdentityUserNotFoundError(userId);
        const active = sessions.filter(s => s.status === "active"); const issued = sessions.map(s => s.issuedAt).sort(); const expiries = active.map(s => s.expiresAt).sort();
        return { userId, identityStatus: user.status, emailVerified: user.emailVerified, verification: { emailVerified: user.emailVerified, state: user.emailVerified ? "verified" : "pending" }, authentication: { credentialActive: passwordCredential !== null, signInEligible: user.status === "active" && user.emailVerified && passwordCredential !== null }, recovery: { state: recovery === null ? "none" : "requested", ...(recovery ? { lastRequestedAt: recovery.requestedAt } : {}) }, sessions: { total: sessions.length, active: active.length, signedOut: sessions.filter(s=>s.status==="signed_out").length, revoked: sessions.filter(s=>s.status==="revoked").length, expired: sessions.filter(s=>s.status==="expired").length, ...(issued.length ? { lastIssuedAt: issued[issued.length-1] } : {}), ...(expiries.length ? { nearestActiveExpiryAt: expiries[0] } : {}) }, indicators: { suspended: user.status === "suspended", unverifiedEmail: !user.emailVerified, activeSessionsPresent: active.length > 0, recoveryInProgress: recovery !== null } };
    }};
}
