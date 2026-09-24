
// services/access/src/authorization/register-notification-administrative-permissions.ts
// -----------------------------------------------------------------------------
// REGISTER NOTIFICATION ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Narrow Access-owned adapter for adding Notification permission definitions to
// the existing canonical Permission catalog/bootstrap flow.
//
// This helper deliberately depends only on the minimum catalog registration
// operation. The Access composition root may bind the existing implementation
// without introducing Notification logic into Access.
// -----------------------------------------------------------------------------

import {
    NOTIFICATION_ADMINISTRATIVE_PERMISSIONS,
} from "./notification-administrative-permissions";

export interface AccessPermissionCatalogRegistration {
    register(
        permission: {
            readonly service:
                string;

            readonly resource:
                string;

            readonly action:
                string;

            readonly displayName:
                string;

            readonly description:
                string;
        },
    ): void;
}

export function registerNotificationAdministrativePermissions(
    catalog:
        AccessPermissionCatalogRegistration,
): void {
    for (
        const permission
        of NOTIFICATION_ADMINISTRATIVE_PERMISSIONS
    ) {
        catalog.register(
            permission,
        );
    }
}
