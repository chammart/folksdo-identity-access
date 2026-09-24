// services/access/src/api/dto/grant-permission-request.ts
// -----------------------------------------------------------------------------
// GRANT PERMISSION REQUEST
// -----------------------------------------------------------------------------
// Transport-safe command for creating a direct permission assignment.
//
// Direct assignments may grant or deny a permission. Final precedence remains
// the responsibility of the Access authorization model.
// -----------------------------------------------------------------------------

import type {
    PermissionAssignmentEffect,
    PermissionAssignmentSubjectType,
} from "./permission-assignment-dto";

export type ApiPermissionAssignmentScope =
    | "tenant"
    | "resource";

export interface ApiGrantPermissionRequest {
    readonly permissionId: string;

    readonly subjectType: PermissionAssignmentSubjectType;

    readonly subjectId: string;

    readonly identityId?: string;

    readonly membershipId?: string;

    readonly tenantId?: string;

    /**
     * Explicit assignment effect.
     */
    readonly effect: PermissionAssignmentEffect;

    readonly scope: ApiPermissionAssignmentScope;

    /**
     * Required when scope is resource.
     */
    readonly resource?: {
        readonly type: string;
        readonly id: string;
    };

    /**
     * Optional ISO 8601 expiration time.
     */
    readonly expiresAt?: string;
}