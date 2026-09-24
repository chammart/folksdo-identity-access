// services/access/src/authorization/permission-precedence.ts
// -----------------------------------------------------------------------------
// PERMISSION PRECEDENCE
// -----------------------------------------------------------------------------
// Deterministic precedence rules for effective Permission resolution.
//
// Purpose:
//   • resolve competing direct and Role-derived Permission assignments
//   • ensure direct denials override all Permission grants
//   • preserve deny-by-default authorization
//   • avoid order-dependent authorization behavior
//   • keep Policy and Restriction evaluation outside Permission composition
//
// Boundary:
//   • resolves only effective Permission assignment evidence
//   • does not evaluate Membership validity
//   • does not evaluate subscription capabilities
//   • does not evaluate authorization Policies
//   • does not evaluate Access Restrictions
//   • performs no persistence or external queries
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// EFFECT
// -----------------------------------------------------------------------------

export type PermissionEffect =
    | "grant"
    | "deny";

// -----------------------------------------------------------------------------
// SOURCE
// -----------------------------------------------------------------------------

export type PermissionPrecedenceSource =
    | "role_grant"
    | "direct_grant"
    | "direct_deny"
    | "default_deny";

// -----------------------------------------------------------------------------
// PRECEDENCE CANDIDATE
// -----------------------------------------------------------------------------

export interface PermissionPrecedenceCandidate {
    /**
     * Authorization effect contributed by the Permission source.
     */
    readonly effect: PermissionEffect;

    /**
     * Effective Permission source.
     */
    readonly source: PermissionPrecedenceSource;

    /**
     * Stable Role Assignment or Permission Assignment identifier.
     */
    readonly sourceId?: string;

    /**
     * Additional stable explanation suitable for diagnostics and audit.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// RESOLUTION
// -----------------------------------------------------------------------------

export interface PermissionPrecedenceResolution {
    /**
     * Resolved effective Permission effect.
     */
    readonly effect: PermissionEffect;

    /**
     * Permission source that determined the resolution.
     */
    readonly source: PermissionPrecedenceSource;

    /**
     * Stable Role Assignment or Permission Assignment identifier.
     */
    readonly sourceId?: string;

    /**
     * Additional stable explanation suitable for diagnostics and audit.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// PRECEDENCE
// -----------------------------------------------------------------------------
// Higher values have stronger Permission precedence.
//
// Deterministic order:
//
//   direct deny
//   ↓
//   direct grant
//   ↓
//   role grant
//   ↓
//   default deny
//
// Authorization Policies and Access Restrictions do not participate here.
// They are independent deny gates evaluated after effective Permission
// resolution.
// -----------------------------------------------------------------------------

const permissionPrecedence: Readonly<
    Record<PermissionPrecedenceSource, number>
> = {
    direct_deny: 400,

    direct_grant: 300,

    role_grant: 200,

    default_deny: 100,
};

// -----------------------------------------------------------------------------
// RESOLVE PERMISSION PRECEDENCE
// -----------------------------------------------------------------------------

export function resolvePermissionPrecedence(
    candidates: readonly PermissionPrecedenceCandidate[],
): PermissionPrecedenceResolution {
    const defaultResolution: PermissionPrecedenceResolution = {
        effect: "deny",

        source: "default_deny",

        reason: "No effective Permission grant was found.",
    };

    if (candidates.length === 0) {
        return defaultResolution;
    }

    const orderedCandidates = [
        ...candidates,
    ].sort(
        comparePermissionPrecedence,
    );

    const resolved =
        orderedCandidates[0];

    if (!resolved) {
        return defaultResolution;
    }

    return {
        effect: resolved.effect,

        source: resolved.source,

        sourceId: resolved.sourceId,

        reason: resolved.reason,
    };
}

// -----------------------------------------------------------------------------
// COMPARE PERMISSION PRECEDENCE
// -----------------------------------------------------------------------------

function comparePermissionPrecedence(
    left: PermissionPrecedenceCandidate,
    right: PermissionPrecedenceCandidate,
): number {
    const precedenceDifference =
        permissionPrecedence[right.source]
        - permissionPrecedence[left.source];

    if (precedenceDifference !== 0) {
        return precedenceDifference;
    }

    return compareStableSourceIdentifiers(
        left.sourceId,
        right.sourceId,
    );
}

// -----------------------------------------------------------------------------
// STABLE SOURCE IDENTIFIER ORDER
// -----------------------------------------------------------------------------

function compareStableSourceIdentifiers(
    left?: string,
    right?: string,
): number {
    return (left ?? "")
        .localeCompare(
            right ?? "",
        );
}