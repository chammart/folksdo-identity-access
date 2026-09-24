// services/access/src/authorization/payment-administrative-permissions.ts
// -----------------------------------------------------------------------------
// PAYMENT ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for Payment Operations™.
//
// Purpose:
//   • define stable Permission identifiers for protected Payment actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent Payment/server composition from constructing identifiers ad hoc
//   • distinguish Payment execution authority from provider administration
//
// Boundary:
//   • Access Operations™ owns the canonical Permission Catalog
//   • Payment Operations™ declares which protected business action is required
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// PAYMENT ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type PaymentAdministrativePermissionId =
    `payment.${string}.${string}`;

// -----------------------------------------------------------------------------
// PAYMENT ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface PaymentAdministrativePermission
    extends AccessPermissionRequest {
    readonly permissionId:
        PaymentAdministrativePermissionId;

    readonly service:
        "payment";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function definePaymentAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource:
        TResource,

    action:
        TAction,
): PaymentAdministrativePermission & {
    readonly permissionId:
        `payment.${TResource}.${TAction}`;

    readonly service:
        "payment";

    readonly resource:
        TResource;

    readonly action:
        TAction;
} {
    const permissionId =
        `payment.${resource}.${action}` as
        `payment.${TResource}.${TAction}`;

    return {
        permissionId,

        service:
            "payment",

        resource,

        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL PAYMENT PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const PAYMENT_ADMINISTRATIVE_PERMISSIONS = {
    // -------------------------------------------------------------------------
    // PROVIDER CONFIGURATION
    // -------------------------------------------------------------------------

    providerConfigure:
        definePaymentAdministrativePermission(
            "provider",
            "configure",
        ),

    providerActivate:
        definePaymentAdministrativePermission(
            "provider",
            "activate",
        ),

    providerDeactivate:
        definePaymentAdministrativePermission(
            "provider",
            "deactivate",
        ),

    providerView:
        definePaymentAdministrativePermission(
            "provider",
            "view",
        ),

    providerList:
        definePaymentAdministrativePermission(
            "provider",
            "list",
        ),

    // -------------------------------------------------------------------------
    // PROVIDER ROUTING
    // -------------------------------------------------------------------------

    routingConfigure:
        definePaymentAdministrativePermission(
            "routing",
            "configure",
        ),

    routingView:
        definePaymentAdministrativePermission(
            "routing",
            "view",
        ),
} as const;

export type PaymentAdministrativePermissionName =
    keyof typeof PAYMENT_ADMINISTRATIVE_PERMISSIONS;
