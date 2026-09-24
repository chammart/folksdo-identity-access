// services/access/src/api/dto/create-permission-request.ts
// -----------------------------------------------------------------------------
// CREATE PERMISSION REQUEST
// -----------------------------------------------------------------------------
// Transport-safe request accepted by the Create Permission API operation.
//
// Boundary:
//   • contains client-supplied permission definition data only
//   • does not contain generated identifiers or timestamps
//   • does not enforce permission uniqueness or business eligibility
// -----------------------------------------------------------------------------

import type {
    PermissionScope,
} from "./permission-dto";

export interface ApiCreatePermissionRequest {
    readonly key: string;

    readonly name: string;

    readonly description?: string;

    readonly scope: PermissionScope;
}