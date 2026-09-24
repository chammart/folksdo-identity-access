// services/access/src/authorization/billing-administrative-permissions.ts
// -----------------------------------------------------------------------------
// BILLING ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for Billing Operations™.
//
// Purpose:
//   • define stable Permission identifiers for protected Billing actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent Billing/server composition from constructing identifiers ad hoc
//   • distinguish Tenant-local financial visibility from provider authority
//
// Boundary:
//   • Access Operations™ owns the canonical Permission Catalog
//   • Billing Operations™ declares which protected business action is required
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// BILLING ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type BillingAdministrativePermissionId =
    `billing.${string}.${string}`;

// -----------------------------------------------------------------------------
// BILLING ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface BillingAdministrativePermission
    extends AccessPermissionRequest {
    readonly permissionId:
    BillingAdministrativePermissionId;

    readonly service:
    "billing";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function defineBillingAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): BillingAdministrativePermission & {
    readonly permissionId:
    `billing.${TResource}.${TAction}`;

    readonly service:
    "billing";

    readonly resource:
    TResource;

    readonly action:
    TAction;
} {
    const permissionId =
        `billing.${resource}.${action}` as
        `billing.${TResource}.${TAction}`;

    return {
        permissionId,

        service:
            "billing",

        resource,

        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL BILLING PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const BILLING_ADMINISTRATIVE_PERMISSIONS = {
    // -------------------------------------------------------------------------
    // BILLING ACCOUNT
    // -------------------------------------------------------------------------

    accountCreate:
        defineBillingAdministrativePermission(
            "account",
            "create",
        ),

    accountUpdateProfile:
        defineBillingAdministrativePermission(
            "account",
            "update-profile",
        ),

    accountSuspend:
        defineBillingAdministrativePermission(
            "account",
            "suspend",
        ),

    accountResume:
        defineBillingAdministrativePermission(
            "account",
            "resume",
        ),

    accountClose:
        defineBillingAdministrativePermission(
            "account",
            "close",
        ),

    accountView:
        defineBillingAdministrativePermission(
            "account",
            "view",
        ),

    accountList:
        defineBillingAdministrativePermission(
            "account",
            "list",
        ),

    // -------------------------------------------------------------------------
    // CHARGE
    // -------------------------------------------------------------------------

    chargeRecognize:
        defineBillingAdministrativePermission(
            "charge",
            "recognize",
        ),

    chargeMakeBillable:
        defineBillingAdministrativePermission(
            "charge",
            "make-billable",
        ),

    chargeVoid:
        defineBillingAdministrativePermission(
            "charge",
            "void",
        ),

    chargeView:
        defineBillingAdministrativePermission(
            "charge",
            "view",
        ),

    chargeList:
        defineBillingAdministrativePermission(
            "charge",
            "list",
        ),

    // -------------------------------------------------------------------------
    // INVOICE
    // -------------------------------------------------------------------------

    invoiceCreate:
        defineBillingAdministrativePermission(
            "invoice",
            "create",
        ),

    invoiceIssue:
        defineBillingAdministrativePermission(
            "invoice",
            "issue",
        ),

    invoiceVoid:
        defineBillingAdministrativePermission(
            "invoice",
            "void",
        ),

    invoiceView:
        defineBillingAdministrativePermission(
            "invoice",
            "view",
        ),

    invoiceList:
        defineBillingAdministrativePermission(
            "invoice",
            "list",
        ),

    // -------------------------------------------------------------------------
    // CREDIT
    // -------------------------------------------------------------------------

    creditCreate:
        defineBillingAdministrativePermission(
            "credit",
            "create",
        ),

    creditApply:
        defineBillingAdministrativePermission(
            "credit",
            "apply",
        ),

    creditView:
        defineBillingAdministrativePermission(
            "credit",
            "view",
        ),

    creditList:
        defineBillingAdministrativePermission(
            "credit",
            "list",
        ),
} as const;

// -----------------------------------------------------------------------------
// BILLING ADMINISTRATIVE PERMISSION NAME
// -----------------------------------------------------------------------------

export type BillingAdministrativePermissionName =
    keyof typeof BILLING_ADMINISTRATIVE_PERMISSIONS;