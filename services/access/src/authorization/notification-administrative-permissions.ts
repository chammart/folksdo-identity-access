
// services/access/src/authorization/notification-administrative-permissions.ts
// -----------------------------------------------------------------------------
// NOTIFICATION ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Access Operations™ catalog entries for protected Notification Operations™
// administration.
//
// Ownership:
//   • Notification Operations™ declares required permission identities
//   • Access Operations™ owns canonical Permission catalog registration
//   • this file contains Access-owned catalog metadata only
//
// Boundary:
//   • no Notification business rules
//   • no Notification lifecycle evaluation
//   • no provider or Email delivery behavior
// -----------------------------------------------------------------------------

export const NOTIFICATION_ADMINISTRATIVE_PERMISSIONS = [
    {
        service:
            "notification",

        resource:
            "notification",

        action:
            "view",

        displayName:
            "View Notification",

        description:
            "View one Notification within the authorized scope.",
    },
    {
        service:
            "notification",

        resource:
            "notification",

        action:
            "list",

        displayName:
            "List Notifications",

        description:
            "List Notifications within the authorized scope.",
    },
    {
        service:
            "notification",

        resource:
            "notification",

        action:
            "cancel",

        displayName:
            "Cancel Notification",

        description:
            "Cancel an eligible unsent Notification.",
    },
    {
        service:
            "notification",

        resource:
            "notification",

        action:
            "retry",

        displayName:
            "Retry Notification",

        description:
            "Retry an eligible Notification delivery.",
    },
    {
        service:
            "notification",

        resource:
            "notification",

        action:
            "suppress",

        displayName:
            "Suppress Notification",

        description:
            "Suppress an eligible Notification from delivery.",
    },
    {
        service:
            "notification",

        resource:
            "delivery",

        action:
            "view",

        displayName:
            "View Notification Delivery History",

        description:
            "View normalized Notification delivery-attempt history.",
    },
] as const;
