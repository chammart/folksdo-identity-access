// services/access/src/business-rules/authorization-lifecycle.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHORIZATION LIFECYCLE RULES
// -----------------------------------------------------------------------------
// Pure lifecycle rules shared by Access-owned authorization capabilities.
// These functions contain no persistence, transport, or event concerns.
// -----------------------------------------------------------------------------

import type {
    KnownIdentity,
    KnownMembership,
    KnownSubscriptionCapabilities,
    KnownSubscriptionStatus,
    KnownTenant,
} from "../known-facts";

import type {
    PermissionAssignmentState,
    PermissionAssignmentSuspensionSource,
    RoleAssignmentState,
    RoleAssignmentSuspensionSource,
} from "../state";

export type AccessAssignment =
    RoleAssignmentState
    | PermissionAssignmentState;

function suspendAssignment<
    T extends AccessAssignment,
>(
    assignment: T,
    source:
        RoleAssignmentSuspensionSource
        & PermissionAssignmentSuspensionSource,
    now: string,
): T {
    if (
        [
            "expired",
            "archived",
            "removed",
            "revoked",
        ].includes(
            assignment.status,
        )
    ) {
        return assignment;
    }

    if (
        assignment.suspensionSources.includes(
            source,
        )
    ) {
        return assignment;
    }

    const suspensionSources =
        [
            ...assignment.suspensionSources,
            source,
        ] as T["suspensionSources"];

    return {
        ...assignment,

        status:
            assignment.status === "active"
                || assignment.status === "suspended"
                ? "suspended"
                : assignment.status,

        suspensionSources,

        suspendedAt:
            now,

        updatedAt:
            now,
    } as T;
}

function restoreAssignment<
    T extends AccessAssignment,
>(
    assignment: T,
    source:
        RoleAssignmentSuspensionSource
        & PermissionAssignmentSuspensionSource,
    now: string,
): T {
    if (
        !assignment.suspensionSources.includes(
            source,
        )
    ) {
        return assignment;
    }

    const suspensionSources =
        assignment.suspensionSources.filter(
            value =>
                value !== source,
        ) as T["suspensionSources"];

    return {
        ...assignment,

        status:
            assignment.status === "suspended"
                && suspensionSources.length === 0
                ? "active"
                : assignment.status,

        suspensionSources,

        reactivatedAt:
            suspensionSources.length === 0
                ? now
                : assignment.reactivatedAt,

        updatedAt:
            now,
    } as T;
}

function archiveAssignment<
    T extends AccessAssignment,
>(
    assignment: T,
    source:
        "identity"
        | "membership"
        | "tenant",
    now: string,
): T {
    if (
        assignment.status
        === "archived"
    ) {
        return assignment;
    }

    if (
        [
            "expired",
            "removed",
            "revoked",
        ].includes(
            assignment.status,
        )
    ) {
        return assignment;
    }

    return {
        ...assignment,

        status:
            "archived",

        archiveSource:
            source,

        archivedAt:
            now,

        updatedAt:
            now,
    } as T;
}

// -----------------------------------------------------------------------------
// MEMBERSHIP ASSIGNMENT LIFECYCLE
// -----------------------------------------------------------------------------

export const suspendAssignmentForMembership =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        suspendAssignment(
            assignment,
            "membership",
            now,
        );

export const restoreAssignmentForMembership =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        restoreAssignment(
            assignment,
            "membership",
            now,
        );

export const archiveAssignmentForMembership =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        archiveAssignment(
            assignment,
            "membership",
            now,
        );

// -----------------------------------------------------------------------------
// TENANT ASSIGNMENT LIFECYCLE
// -----------------------------------------------------------------------------

export const suspendAssignmentForTenant =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        suspendAssignment(
            assignment,
            "tenant",
            now,
        );

export const reactivateAssignmentForTenant =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        restoreAssignment(
            assignment,
            "tenant",
            now,
        );

export const archiveAssignmentForTenant =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        archiveAssignment(
            assignment,
            "tenant",
            now,
        );

// -----------------------------------------------------------------------------
// IDENTITY ASSIGNMENT LIFECYCLE
// -----------------------------------------------------------------------------

export const archiveAssignmentForIdentity =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        archiveAssignment(
            assignment,
            "identity",
            now,
        );

export const restoreAssignmentForIdentity =
    <T extends AccessAssignment>(
        assignment: T,
        now: string,
    ): T =>
        restoreAssignment(
            assignment,
            "identity",
            now,
        );

// -----------------------------------------------------------------------------
// IDENTITY KNOWN FACT LIFECYCLE
// -----------------------------------------------------------------------------

export function archiveKnownIdentity(
    identity:
        KnownIdentity | null,
    identityId:
        string,
    now:
        string,
): KnownIdentity {
    if (
        identity?.status
        === "archived"
    ) {
        return identity;
    }

    return {
        ...(
            identity
            ?? {
                identityId,
            }
        ),

        status:
            "archived",

        archivedAt:
            now,

        updatedAt:
            now,
    };
}

export function restoreKnownIdentity(
    identity:
        KnownIdentity | null,
    identityId:
        string,
    now:
        string,
): KnownIdentity {
    if (
        identity?.status
        === "active"
    ) {
        return identity;
    }

    return {
        ...(
            identity
            ?? {
                identityId,
            }
        ),

        status:
            "active",

        restoredAt:
            now,

        activatedAt:
            identity?.activatedAt
            ?? now,

        updatedAt:
            now,
    };
}

export function activateKnownIdentity(
    identity: KnownIdentity | null,
    identityId: string,
    now: string,
): KnownIdentity {
    if (identity?.status === "active") {
        return identity;
    }

    return {
        ...(identity ?? { identityId }),
        status: "active",
        activatedAt: identity?.activatedAt ?? now,
        updatedAt: now,
    };
}

// -----------------------------------------------------------------------------
// MEMBERSHIP KNOWN FACT LIFECYCLE
// -----------------------------------------------------------------------------

export function recordKnownMembership(
    current: KnownMembership | null,
    input: Omit<KnownMembership, "status" | "updatedAt">,
    now: string,
): KnownMembership {
    if (current !== null) {
        return current;
    }

    return {
        ...input,
        status: "pending",
        updatedAt: now,
    };
}

export function activateKnownMembership(
    current:
        KnownMembership | null,
    input:
        Omit<
            KnownMembership,
            "status" | "updatedAt"
        >,
    now:
        string,
): KnownMembership {
    return {
        ...(
            current
            ?? input
        ),

        ...input,

        status:
            "active",

        activatedAt:
            current?.activatedAt
            ?? now,

        suspensionSource:
            undefined,

        updatedAt:
            now,
    };
}

export function suspendKnownMembership(
    current:
        KnownMembership | null,
    input:
        Omit<
            KnownMembership,
            "status" | "updatedAt"
        >,
    now:
        string,
): KnownMembership {
    return {
        ...(
            current
            ?? input
        ),

        ...input,

        status:
            "suspended",

        suspendedAt:
            now,

        suspensionSource:
            "manual",

        updatedAt:
            now,
    };
}

export function archiveKnownMembership(
    current:
        KnownMembership | null,
    input:
        Omit<
            KnownMembership,
            "status" | "updatedAt"
        >,
    now:
        string,
): KnownMembership {
    return {
        ...(
            current
            ?? input
        ),

        ...input,

        status:
            "archived",

        archivedAt:
            now,

        updatedAt:
            now,
    };
}

export function reactivateKnownMembership(
    current:
        KnownMembership | null,
    input:
        Omit<
            KnownMembership,
            "status" | "updatedAt"
        >,
    now:
        string,
): KnownMembership {
    return {
        ...(
            current
            ?? input
        ),

        ...input,

        status:
            "active",

        reactivatedAt:
            now,

        suspensionSource:
            undefined,

        updatedAt:
            now,
    };
}

// -----------------------------------------------------------------------------
// TENANT KNOWN FACT LIFECYCLE
// -----------------------------------------------------------------------------

export function provisionKnownTenant(
    current:
        KnownTenant | null,
    tenantId:
        string,
    now:
        string,
): KnownTenant {
    if (
        current !== null
    ) {
        return current;
    }

    return {
        tenantId,

        status:
            "provisioning",

        createdAt:
            now,

        updatedAt:
            now,
    };
}

export function activateKnownTenant(
    current:
        KnownTenant | null,
    tenantId:
        string,
    now:
        string,
): KnownTenant {
    if (
        current?.status
        === "archived"
    ) {
        return current;
    }

    if (
        current?.status
        === "suspended"
    ) {
        return current;
    }

    if (
        current?.status
        === "active"
    ) {
        return current;
    }

    return {
        ...(
            current
            ?? {
                tenantId,
            }
        ),

        tenantId,

        status:
            "active",

        activatedAt:
            current?.activatedAt
            ?? now,

        updatedAt:
            now,
    };
}

export function suspendKnownTenant(
    current:
        KnownTenant | null,
    tenantId:
        string,
    now:
        string,
): KnownTenant {
    if (
        current?.status
        === "archived"
    ) {
        return current;
    }

    if (
        current?.status
        === "suspended"
    ) {
        return current;
    }

    return {
        ...(
            current
            ?? {
                tenantId,
            }
        ),

        tenantId,

        status:
            "suspended",

        suspendedAt:
            now,

        updatedAt:
            now,
    };
}

export function archiveKnownTenant(
    current:
        KnownTenant | null,
    tenantId:
        string,
    now:
        string,
): KnownTenant {
    if (
        current?.status
        === "archived"
    ) {
        return current;
    }

    return {
        ...(
            current
            ?? {
                tenantId,
            }
        ),

        tenantId,

        status:
            "archived",

        archivedAt:
            now,

        updatedAt:
            now,
    };
}

export function reactivateKnownTenant(
    current:
        KnownTenant | null,
    tenantId:
        string,
    now:
        string,
): KnownTenant {
    if (
        current?.status
        === "archived"
    ) {
        return current;
    }

    if (
        current?.status
        === "active"
    ) {
        return current;
    }

    if (
        current?.status
        === "provisioning"
    ) {
        return current;
    }

    return {
        ...(
            current
            ?? {
                tenantId,
            }
        ),

        tenantId,

        status:
            "active",

        reactivatedAt:
            now,

        activatedAt:
            current?.activatedAt
            ?? now,

        updatedAt:
            now,
    };
}

// -----------------------------------------------------------------------------
// SUBSCRIPTION KNOWN FACT LIFECYCLE
// -----------------------------------------------------------------------------

export function applyKnownSubscriptionCapabilities(
    input: {
        current:
        KnownSubscriptionCapabilities | null;

        tenantId:
        string;

        subscriptionId:
        string;

        status:
        KnownSubscriptionStatus;

        capabilities:
        readonly string[];

        effectiveAt:
        string;

        expiresAt?:
        string;

        now:
        string;
    },
): KnownSubscriptionCapabilities {
    return {
        tenantId:
            input.tenantId,

        subscriptionId:
            input.subscriptionId,

        status:
            input.status,

        capabilities:
            [
                ...new Set(
                    input.capabilities,
                ),
            ].sort(),

        effectiveAt:
            input.effectiveAt,

        expiresAt:
            input.expiresAt,

        updatedAt:
            input.now,
    };
}