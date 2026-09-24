// services/access/src/business-rules/apply-security-policy-to-assignment.ts
// -----------------------------------------------------------------------------
// APPLY SECURITY POLICY TO ASSIGNMENT
// -----------------------------------------------------------------------------
// Applies or removes Security Policy suspension provenance on an Access-owned
// role or permission assignment.
//
// Boundary:
//   • owns deterministic assignment lifecycle transitions
//   • preserves unrelated suspension sources
//   • never restores terminal assignments
//   • contains no persistence or application orchestration
// -----------------------------------------------------------------------------

import type {
    PermissionAssignmentState,
    RoleAssignmentState,
} from "../../state";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type SecurityPolicyAssignmentAction =
    | "suspend"
    | "restore";

export type SecurityPolicyAssignment =
    | RoleAssignmentState
    | PermissionAssignmentState;

// -----------------------------------------------------------------------------
// TERMINAL STATUS
// -----------------------------------------------------------------------------

function isTerminalAssignmentStatus(
    status: SecurityPolicyAssignment["status"],
): boolean {
    return (
        status === "expired" ||
        status === "archived" ||
        status === "removed" ||
        status === "revoked"
    );
}

// -----------------------------------------------------------------------------
// BUSINESS RULE
// -----------------------------------------------------------------------------

export function applySecurityPolicyToAssignment<
    TAssignment extends SecurityPolicyAssignment,
>(
    assignment: TAssignment,
    action: SecurityPolicyAssignmentAction,
    now: string,
): TAssignment {
    const hasSecurityPolicySource =
        assignment.suspensionSources.includes("security_policy");

    if (action === "suspend") {
        if (
            hasSecurityPolicySource ||
            isTerminalAssignmentStatus(assignment.status)
        ) {
            return assignment;
        }

        return {
            ...assignment,
            status:
                assignment.status === "active"
                    ? "suspended"
                    : assignment.status,
            suspensionSources: [
                ...assignment.suspensionSources,
                "security_policy",
            ],
            suspendedAt: now,
            updatedAt: now,
        } as TAssignment;
    }

    if (!hasSecurityPolicySource) {
        return assignment;
    }

    const remainingSuspensionSources =
        assignment.suspensionSources.filter(
            (source) => source !== "security_policy",
        );

    const canReactivate =
        assignment.status === "suspended" &&
        remainingSuspensionSources.length === 0;

    return {
        ...assignment,
        status: canReactivate
            ? "active"
            : assignment.status,
        suspensionSources: remainingSuspensionSources,
        reactivatedAt: canReactivate
            ? now
            : assignment.reactivatedAt,
        updatedAt: now,
    } as TAssignment;
}