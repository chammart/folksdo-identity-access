// services/access/src/authorization/subscription-administrative-permissions.ts
// -----------------------------------------------------------------------------
// SUBSCRIPTION ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for Subscription Operations™.
//
// Purpose:
//   • define stable Permission identifiers for protected Subscription actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent Subscription/server composition from constructing identifiers ad hoc
//   • distinguish Tenant-local commercial visibility from provider authority
//
// Boundary:
//   • Access Operations™ owns the canonical Permission Catalog
//   • Subscription Operations™ declares which protected business action is required
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// SUBSCRIPTION ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type SubscriptionAdministrativePermissionId =
    `subscription.${string}.${string}`;

// -----------------------------------------------------------------------------
// SUBSCRIPTION ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface SubscriptionAdministrativePermission
    extends AccessPermissionRequest {
    readonly permissionId:
    SubscriptionAdministrativePermissionId;

    readonly service:
    "subscription";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function defineSubscriptionAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): SubscriptionAdministrativePermission & {
    readonly permissionId:
    `subscription.${TResource}.${TAction}`;

    readonly service:
    "subscription";

    readonly resource:
    TResource;

    readonly action:
    TAction;
} {
    const permissionId =
        `subscription.${resource}.${action}` as
        `subscription.${TResource}.${TAction}`;

    return {
        permissionId,

        service:
            "subscription",

        resource,

        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL SUBSCRIPTION PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const SUBSCRIPTION_ADMINISTRATIVE_PERMISSIONS = {
    // -------------------------------------------------------------------------
    // SUBSCRIPTION AGREEMENT
    // -------------------------------------------------------------------------

    subscriptionCreate:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "create",
        ),

    subscriptionView:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "view",
        ),

    subscriptionViewGoverning:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "view-governing",
        ),

    subscriptionList:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "list",
        ),

    subscriptionChangePlan:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "change-plan",
        ),

    subscriptionUpdateEntitlements:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "update-entitlements",
        ),

    subscriptionUpdateQuotas:
        defineSubscriptionAdministrativePermission(
            "subscription",
            "update-quotas",
        ),

    // -------------------------------------------------------------------------
    // SUBSCRIPTION LIFECYCLE
    // -------------------------------------------------------------------------

    lifecycleActivate:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "activate",
        ),

    lifecycleSuspend:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "suspend",
        ),

    lifecycleResume:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "resume",
        ),

    lifecycleExpire:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "expire",
        ),

    lifecycleCancel:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "cancel",
        ),

    lifecycleRenew:
        defineSubscriptionAdministrativePermission(
            "lifecycle",
            "renew",
        ),

    // -------------------------------------------------------------------------
    // PLAN CATALOG
    // -------------------------------------------------------------------------

    planCreate:
        defineSubscriptionAdministrativePermission(
            "plan",
            "create",
        ),

    planUpdate:
        defineSubscriptionAdministrativePermission(
            "plan",
            "update",
        ),

    planRetire:
        defineSubscriptionAdministrativePermission(
            "plan",
            "retire",
        ),

    planView:
        defineSubscriptionAdministrativePermission(
            "plan",
            "view",
        ),

    planList:
        defineSubscriptionAdministrativePermission(
            "plan",
            "list",
        ),

    // -------------------------------------------------------------------------
    // ENTITLEMENT DEFINITION CATALOG
    // -------------------------------------------------------------------------

    entitlementDefinitionCreate:
        defineSubscriptionAdministrativePermission(
            "entitlement-definition",
            "create",
        ),

    entitlementDefinitionUpdate:
        defineSubscriptionAdministrativePermission(
            "entitlement-definition",
            "update",
        ),

    entitlementDefinitionRetire:
        defineSubscriptionAdministrativePermission(
            "entitlement-definition",
            "retire",
        ),

    entitlementDefinitionView:
        defineSubscriptionAdministrativePermission(
            "entitlement-definition",
            "view",
        ),

    entitlementDefinitionList:
        defineSubscriptionAdministrativePermission(
            "entitlement-definition",
            "list",
        ),

    // -------------------------------------------------------------------------
    // QUOTA DEFINITION CATALOG
    // -------------------------------------------------------------------------

    quotaDefinitionCreate:
        defineSubscriptionAdministrativePermission(
            "quota-definition",
            "create",
        ),

    quotaDefinitionUpdate:
        defineSubscriptionAdministrativePermission(
            "quota-definition",
            "update",
        ),

    quotaDefinitionRetire:
        defineSubscriptionAdministrativePermission(
            "quota-definition",
            "retire",
        ),

    quotaDefinitionView:
        defineSubscriptionAdministrativePermission(
            "quota-definition",
            "view",
        ),

    quotaDefinitionList:
        defineSubscriptionAdministrativePermission(
            "quota-definition",
            "list",
        ),
} as const;

// -----------------------------------------------------------------------------
// SUBSCRIPTION ADMINISTRATIVE PERMISSION NAME
// -----------------------------------------------------------------------------

export type SubscriptionAdministrativePermissionName =
    keyof typeof SUBSCRIPTION_ADMINISTRATIVE_PERMISSIONS;