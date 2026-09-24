// apps/server/src/config/server-config.ts
// -----------------------------------------------------------------------------
// IAM SERVER CONFIG
// -----------------------------------------------------------------------------
// Parses process configuration once and passes each capability its owned
// configuration contract.
// -----------------------------------------------------------------------------

import type { AccessServiceConfig } from "@folksdo-identity-access/access";
import type { IdentityServiceConfig } from "@folksdo-identity-access/identity";
import type { MembershipServiceConfig } from "@folksdo-identity-access/membership";
import type { PlatformRuntimeConfig } from "@folksdo-platform/runtime";
import { createHostPlatformConfig } from "../platform-config";

export interface ServerConfig {
    readonly port: number;
    readonly logLevel: "debug" | "info" | "warn" | "error" | "silent";
    readonly platformRuntime: PlatformRuntimeConfig;
    readonly identity: IdentityServiceConfig;
    readonly membership: MembershipServiceConfig;
    readonly access: AccessServiceConfig;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return {
        port: readPositiveInteger(env.PORT, 3100, "PORT", 65_535),
        logLevel: readLogLevel(env.LOG_LEVEL),
        platformRuntime: createHostPlatformConfig(env),
        identity: {
            betterAuthBaseUrl: requiredEnvironment(env, "IAM_BETTER_AUTH_BASE_URL"),
            betterAuthSecret: readSecret(env, "IAM_BETTER_AUTH_SECRET"),
            betterAuthTrustedOrigins: parseCsv(env.IAM_BETTER_AUTH_TRUSTED_ORIGINS ?? ""),
            invitationSignUpSessionTtlMilliseconds: readPositiveInteger(env.IAM_IDENTITY_INVITATION_SESSION_TTL_MILLISECONDS, 60 * 60 * 1000, "IAM_IDENTITY_INVITATION_SESSION_TTL_MILLISECONDS"),
            signInSessionTtlMilliseconds: readPositiveInteger(env.IAM_IDENTITY_SIGN_IN_SESSION_TTL_MILLISECONDS, 60 * 60 * 1000, "IAM_IDENTITY_SIGN_IN_SESSION_TTL_MILLISECONDS"),
            emailVerificationTtlMilliseconds: readPositiveInteger(env.IAM_IDENTITY_EMAIL_VERIFICATION_TTL_MILLISECONDS, 24 * 60 * 60 * 1000, "IAM_IDENTITY_EMAIL_VERIFICATION_TTL_MILLISECONDS"),
            acceptanceCaptureEnabled: readBoolean(env.IAM_IDENTITY_ACCEPTANCE_CAPTURE_ENABLED, false, "IAM_IDENTITY_ACCEPTANCE_CAPTURE_ENABLED"),
            acceptanceCapturesCollectionName: normalize(env.IAM_IDENTITY_ACCEPTANCE_CAPTURES_COLLECTION_NAME) ?? "identity_acceptance_captures",
        },
        membership: {
            invitationTtlMilliseconds: readPositiveInteger(env.IAM_MEMBERSHIP_INVITATION_TTL_MILLISECONDS, 7 * 24 * 60 * 60 * 1000, "IAM_MEMBERSHIP_INVITATION_TTL_MILLISECONDS"),
            invitationExpirationIntervalMilliseconds: readPositiveInteger(env.IAM_MEMBERSHIP_INVITATION_EXPIRATION_INTERVAL_MILLISECONDS, 60_000, "IAM_MEMBERSHIP_INVITATION_EXPIRATION_INTERVAL_MILLISECONDS"),
            invitationExpirationBatchSize: readPositiveInteger(env.IAM_MEMBERSHIP_INVITATION_EXPIRATION_BATCH_SIZE, 100, "IAM_MEMBERSHIP_INVITATION_EXPIRATION_BATCH_SIZE"),
        },
        access: {
            enabled: true,
        },
    };
}

function requiredEnvironment(env: NodeJS.ProcessEnv, name: string): string {
    const value = normalize(env[name]);
    if (value === undefined) throw new Error(`${name} is required`);
    return value;
}

function readSecret(env: NodeJS.ProcessEnv, name: string): string {
    const value = requiredEnvironment(env, name);
    if (value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
    return value;
}

function normalize(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

function readPositiveInteger(value: string | undefined, defaultValue: number, name: string, maximum?: number): number {
    const parsed = value === undefined ? defaultValue : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
        throw new Error(`${name} must be a positive integer`);
    }
    return parsed;
}

function readBoolean(value: string | undefined, defaultValue: boolean, name: string): boolean {
    if (value === undefined) return defaultValue;
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error(`${name} must be true or false`);
}

function readLogLevel(value: string | undefined): ServerConfig["logLevel"] {
    const level = value ?? "info";

    switch (level) {
        case "debug":
        case "info":
        case "warn":
        case "error":
        case "silent":
            return level;
        default:
            throw new Error("LOG_LEVEL must be debug, info, warn, error, or silent");
    }
}

function parseCsv(value: string): readonly string[] {
    return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => item.length > 0))];
}
